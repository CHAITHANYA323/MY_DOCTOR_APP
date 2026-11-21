const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Lap12NOC\\.gemini\\antigravity\\brain\\5661bf7b-9fbc-4f30-a850-60a6cda0c0fd';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'sidebar_scroll_audit');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.msgId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }

  async eval(expression) {
    const res = await clientSend(this, 'Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async setViewport(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height
    });
  }

  async takeScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const localPath = path.join(OUT_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artifactPath, buffer);
    console.log(`[CDP Screenshot] Saved: ${filename} (${buffer.length} bytes)`);
  }
}

async function clientSend(client, method, params) {
  return client.send(method, params);
}

async function loginAsRole(client, roleKey) {
  // Clear any active tokens by navigating to login with clear
  await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
  await sleep(1500);

  // Clear localStorage
  await client.eval(`
    (() => {
      localStorage.clear();
      sessionStorage.clear();
    })()
  `);
  await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
  await sleep(1500);

  const fillClicked = await client.eval(`
    (() => {
      const btn = document.querySelector('button[data-demo-role="${roleKey}"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log(`[Demo Fill] ${roleKey} clicked:`, fillClicked);
  await sleep(600);

  await client.eval(`
    (() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()
  `);
  await sleep(2500);
}

async function runPortalAudit(client, roleKey, portalName, prefix) {
  console.log(`\n========================================`);
  console.log(`AUDITING PORTAL: ${portalName} (${roleKey})`);
  console.log(`========================================`);

  await client.setViewport(1280, 800, false);
  await loginAsRole(client, roleKey);

  const currentUrl = await client.eval(`window.location.href`);
  console.log(`[${portalName}] Landed at: ${currentUrl}`);

  // Wait for sidebar to appear
  for (let attempt = 0; attempt < 10; attempt++) {
    const hasSidebar = await client.eval(`!!(document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside'))`);
    if (hasSidebar) break;
    await sleep(500);
  }

  // Test 1: Desktop Initial Geometry & Positioning
  const initialMetrics = await client.eval(`
    (() => {
      const sidebar = document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside');
      const mainWrap = document.querySelector('.portal-main-content-wrap') || document.querySelector('main')?.parentElement;
      if (!sidebar) return { found: false };

      const computed = window.getComputedStyle(sidebar);
      const rect = sidebar.getBoundingClientRect();
      const mainRect = mainWrap ? mainWrap.getBoundingClientRect() : null;

      return {
        found: true,
        position: computed.position,
        top: computed.top,
        bottom: computed.bottom,
        left: computed.left,
        zIndex: computed.zIndex,
        width: rect.width,
        height: rect.height,
        windowHeight: window.innerHeight,
        mainMarginLeft: mainWrap ? window.getComputedStyle(mainWrap).marginLeft : null,
        mainLeft: mainRect ? mainRect.left : null,
        hasHorizontalScroll: sidebar.scrollWidth > sidebar.clientWidth
      };
    })()
  `);
  console.log(`[${portalName}] Desktop Initial Sidebar Metrics:`, initialMetrics);

  // Test 2: Window Scroll Down by 400px - Verify Fixed Pinned Behavior
  const scrollTest = await client.eval(`
    (() => {
      window.scrollTo(0, 400);
      const scrolledY = window.scrollY;
      const sidebar = document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside');
      if (!sidebar) return { found: false, scrolledY };
      const rect = sidebar.getBoundingClientRect();

      return {
        scrolledY,
        sidebarTopAfterScroll: rect.top,
        sidebarBottomAfterScroll: rect.bottom,
        sidebarLeftAfterScroll: rect.left,
        windowInnerHeight: window.innerHeight,
        isPinnedToViewportTop: rect.top === 0,
        isPinnedToViewportBottom: Math.abs(rect.bottom - window.innerHeight) <= 2,
        hasHorizontalScroll: sidebar.scrollWidth > sidebar.clientWidth
      };
    })()
  `);
  console.log(`[${portalName}] Desktop While Scrolled 400px:`, scrollTest);

  // Take screenshot while page is scrolled down
  await client.takeScreenshot(`${prefix}_01_scrolled_desktop.png`);

  // Restore page scroll
  await client.eval(`window.scrollTo(0, 0);`);
  await sleep(300);

  // Test 3: Collapse Sidebar & Page Scroll in Collapsed Mode
  await client.eval(`
    (() => {
      const toggle = document.querySelector('.sidebar-edge-toggle-btn') || 
                     document.querySelector('button[aria-label*="Collapse"]') || 
                     document.querySelector('button[title*="Collapse"]');
      if (toggle) toggle.click();
    })()
  `);
  await sleep(400);

  const collapsedScrollTest = await client.eval(`
    (() => {
      window.scrollTo(0, 300);
      const sidebar = document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside');
      const mainWrap = document.querySelector('.portal-main-content-wrap') || document.querySelector('main')?.parentElement;
      const rect = sidebar.getBoundingClientRect();
      const mainRect = mainWrap ? mainWrap.getBoundingClientRect() : null;

      return {
        collapsedWidth: rect.width,
        isPinnedTop: rect.top === 0,
        mainMarginLeft: mainWrap ? window.getComputedStyle(mainWrap).marginLeft : null,
        mainLeft: mainRect ? mainRect.left : null,
        contentNotClipped: mainRect ? mainRect.left >= rect.right : true
      };
    })()
  `);
  console.log(`[${portalName}] Collapsed Mode Metrics:`, collapsedScrollTest);

  await client.takeScreenshot(`${prefix}_02_collapsed_desktop.png`);

  // Restore expanded state and scroll
  await client.eval(`
    (() => {
      window.scrollTo(0, 0);
      const toggle = document.querySelector('.sidebar-edge-toggle-btn') || 
                     document.querySelector('button[aria-label*="Expand"]') || 
                     document.querySelector('button[title*="Expand"]');
      if (toggle) toggle.click();
    })()
  `);
  await sleep(300);

  // Test 4: Mobile Viewport (375x812) Off-Canvas Drawer Behavior
  await client.setViewport(375, 812, true);
  await sleep(500);

  const mobileInitial = await client.eval(`
    (() => {
      const sidebar = document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside');
      const rect = sidebar.getBoundingClientRect();
      const computed = window.getComputedStyle(sidebar);

      return {
        mobileWidth: rect.width,
        rectRight: rect.right,
        isOffCanvas: rect.right <= 0,
        transform: computed.transform
      };
    })()
  `);
  console.log(`[${portalName}] Mobile Closed State:`, mobileInitial);

  // Click hamburger trigger on mobile
  await client.eval(`
    (() => {
      const btn = document.querySelector('[class*="mobile-trigger"]') ||
                  document.querySelector('header button.md-hidden') ||
                  document.querySelector('.md-hidden') ||
                  document.querySelector('button[aria-label*="navigation" i]') ||
                  document.querySelector('button[aria-label*="drawer" i]') ||
                  document.querySelector('header button');
      if (btn) btn.click();
    })()
  `);
  await sleep(400);

  const mobileOpenState = await client.eval(`
    (() => {
      const sidebar = document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside');
      const rect = sidebar.getBoundingClientRect();
      const backdrop = document.querySelector('[style*="rgba(15, 23, 42, 0.65)"]') ||
                       document.querySelector('[role="presentation"]');

      return {
        drawerLeft: rect.left,
        drawerRight: rect.right,
        drawerWidth: rect.width,
        isOpenOnScreen: rect.left === 0,
        hasBackdrop: !!backdrop
      };
    })()
  `);
  console.log(`[${portalName}] Mobile Open Drawer State:`, mobileOpenState);

  await client.takeScreenshot(`${prefix}_03_mobile_drawer_open.png`);

  // Close mobile drawer
  await client.eval(`
    (() => {
      const closeBtn = document.querySelector('[class*="mobile-close-btn"]') ||
                       document.querySelector('aside .md-hidden') ||
                       document.querySelector('aside button[aria-label*="Close" i]');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(300);

  // Restore viewport
  await client.setViewport(1280, 800, false);
  await sleep(300);

  return {
    portalName,
    roleKey,
    initialMetrics,
    scrollTest,
    collapsedScrollTest,
    mobileInitial,
    mobileOpenState
  };
}

async function main() {
  console.log('Starting Chrome in remote debugging mode on port 9222...');
  const userDataDir = path.resolve(__dirname, 'qa_reports', 'chrome_audit_profile');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'http://127.0.0.1:5173/login'
  ], { stdio: 'ignore' });

  await sleep(2500);

  try {
    const versionData = await getJson('http://127.0.0.1:9222/json/version');
    console.log('[CDP] Chrome Version:', versionData.Browser);

    const listData = await getJson('http://127.0.0.1:9222/json/list');
    const pageTarget = listData.find(t => t.type === 'page');
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('No page target with webSocketDebuggerUrl found');
    }

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    console.log('[CDP] Connected to Chrome DevTools Protocol!');

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('CSS.enable');

    const results = [];

    // Audit Reference First: Hospital Admin
    results.push(await runPortalAudit(client, 'HOSPITAL_ADMIN', 'Hospital Admin (Reference)', 'audit_01_hospital_admin'));

    // Audit Other Five Portals
    results.push(await runPortalAudit(client, 'PATIENT', 'Patient Portal', 'audit_02_patient'));
    results.push(await runPortalAudit(client, 'DOCTOR', 'Doctor Portal', 'audit_03_doctor'));
    results.push(await runPortalAudit(client, 'RECEPTIONIST', 'Receptionist Portal', 'audit_04_receptionist'));
    results.push(await runPortalAudit(client, 'HOSPITAL_SUPER_ADMIN', 'Super Admin Portal', 'audit_05_superadmin'));
    results.push(await runPortalAudit(client, 'PLATFORM_OWNER', 'Platform Owner Portal', 'audit_06_platform_owner'));

    await client.close();

    console.log('\n========================================');
    console.log('ALL SIX PORTALS VERIFICATION COMPLETE!');
    console.log('========================================');
    console.log(JSON.stringify(results, null, 2));

    const reportPath = path.join(ARTIFACT_DIR, 'MEDICONNECT_SIDEBAR_FIXED_SCROLL_AUDIT_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`Saved report to: ${reportPath}`);

  } catch (err) {
    console.error('Audit failed with error:', err);
    process.exitCode = 1;
  } finally {
    try {
      chromeProc.kill();
    } catch (_) {}
  }
}

main();
