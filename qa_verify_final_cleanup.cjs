const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'final_cleanup');
const ARTIFACT_DIR = 'C:\\Users\\Lap12NOC\\.gemini\\antigravity\\brain\\5661bf7b-9fbc-4f30-a850-60a6cda0c0fd';

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
    const res = await this.send('Runtime.evaluate', {
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
    console.log(`[CDP] Saved: ${filename} (${buffer.length} bytes)`);
  }
}

async function loginAsRole(client, roleKey) {
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
  console.log(`[Demo Fill] ${roleKey} button clicked:`, fillClicked);
  await sleep(600);

  await client.eval(`
    (() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()
  `);
  await sleep(2200);
}

async function verifyPortal(client, portalName, screenshotPrefix) {
  console.log(`\nVerifying ${portalName}...`);
  const currentUrl = await client.eval(`window.location.href`);
  console.log(`[${portalName}] URL: ${currentUrl}`);

  // 1. Audit Horizontal Scrollbar in Sidebar
  const sidebarMetrics = await client.eval(`
    (() => {
      const sidebar = document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside');
      const nav = sidebar ? (sidebar.querySelector('nav') || sidebar.querySelector('div[style*="overflow"]')) : null;
      if (!sidebar) return { found: false };

      const sidebarScrollWidth = sidebar.scrollWidth;
      const sidebarClientWidth = sidebar.clientWidth;
      const navScrollWidth = nav ? nav.scrollWidth : 0;
      const navClientWidth = nav ? nav.clientWidth : 0;

      // Check all nav items for horizontal overflow
      const navItems = Array.from(sidebar.querySelectorAll('.portal-sidebar-nav-item, nav a'));
      const overflowingItems = navItems.filter(item => item.scrollWidth > item.clientWidth + 1).length;

      return {
        found: true,
        sidebarScrollWidth,
        sidebarClientWidth,
        sidebarHasHorizontalScroll: sidebarScrollWidth > sidebarClientWidth,
        navScrollWidth,
        navClientWidth,
        navHasHorizontalScroll: navScrollWidth > navClientWidth,
        totalItems: navItems.length,
        overflowingItems
      };
    })()
  `);
  console.log(`[${portalName}] Sidebar Horizontal Metrics:`, JSON.stringify(sidebarMetrics));

  // 2. Audit Window / Right-Side Vertical Scrollbar
  const verticalScrollMetrics = await client.eval(`
    (() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const innerHeight = window.innerHeight;
      
      // Perform a test scroll down
      window.scrollTo(0, 200);
      const scrolledY = window.scrollY;
      window.scrollTo(0, 0); // restore

      return {
        scrollHeight,
        clientHeight,
        innerHeight,
        hasVerticalScrollableSpace: scrollHeight > clientHeight,
        canScrollVertically: scrolledY > 0,
        scrolledY
      };
    })()
  `);
  console.log(`[${portalName}] Right-Side Vertical Scroll:`, JSON.stringify(verticalScrollMetrics));

  // Screenshot in Expanded Mode
  await client.takeScreenshot(`${screenshotPrefix}_01_expanded.png`);

  // 3. Test Sidebar Collapse & Collapsed Mode Hover Tooltip
  await client.eval(`
    (() => {
      const toggle = document.querySelector('.sidebar-edge-toggle-btn') || 
                     document.querySelector('button[aria-label*="Collapse"]') || 
                     document.querySelector('button[title*="Collapse"]');
      if (toggle) toggle.click();
    })()
  `);
  await sleep(500);

  const collapsedMetrics = await client.eval(`
    (() => {
      const sidebar = document.querySelector('.portal-desktop-sidebar') || document.querySelector('aside');
      return {
        collapsedWidth: sidebar ? sidebar.offsetWidth : 0,
        isCollapsedClass: sidebar ? sidebar.classList.contains('portal-sidebar-is-collapsed') : false
      };
    })()
  `);
  console.log(`[${portalName}] Collapsed Metrics:`, JSON.stringify(collapsedMetrics));
  await client.takeScreenshot(`${screenshotPrefix}_02_collapsed.png`);

  // Restore back to Expanded Mode
  await client.eval(`
    (() => {
      const toggle = document.querySelector('.sidebar-edge-toggle-btn') || 
                     document.querySelector('button[aria-label*="Expand"]') || 
                     document.querySelector('button[title*="Expand"]');
      if (toggle) toggle.click();
    })()
  `);
  await sleep(400);

  return {
    portalName,
    url: currentUrl,
    sidebarHasHorizontalScroll: sidebarMetrics.sidebarHasHorizontalScroll,
    navHasHorizontalScroll: sidebarMetrics.navHasHorizontalScroll,
    overflowingItems: sidebarMetrics.overflowingItems,
    canScrollVertically: verticalScrollMetrics.canScrollVertically,
    collapsedWidth: collapsedMetrics.collapsedWidth,
    verified: !sidebarMetrics.sidebarHasHorizontalScroll && !sidebarMetrics.navHasHorizontalScroll && collapsedMetrics.collapsedWidth <= 75
  };
}

async function runAudit() {
  console.log('=== STARTING FINAL UI CLEANUP AUDIT ===');
  const userDir = path.resolve(__dirname, 'qa_reports', 'chrome_cleanup_audit_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--headless=new',
    'http://127.0.0.1:5173/login'
  ], { stdio: 'ignore' });

  let client = null;
  const results = {};

  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const version = await getJson('http://127.0.0.1:9222/json/version');
        console.log('[CDP] Connected to Chrome:', version.Browser);
        connected = true;
        break;
      } catch (_) {}
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9222');

    const targets = await getJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    await client.setViewport(1440, 900, false);

    // ==========================================
    // 1. PUBLIC PAGES AUDIT (Welcome & Home)
    // ==========================================
    console.log('\n--- AUDITING PUBLIC PAGES (WELCOME & HOME) ---');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
    await sleep(1500);
    await client.takeScreenshot('cleanup_00_welcome_page.png');

    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/home' });
    await sleep(1500);
    await client.takeScreenshot('cleanup_00_home_page.png');

    // ==========================================
    // 2. AUDIT ALL SIX PORTALS
    // ==========================================
    // Platform Owner
    await loginAsRole(client, 'PLATFORM_OWNER');
    results['Owner'] = await verifyPortal(client, 'Platform Owner', 'cleanup_01_owner');

    // Super Admin
    await loginAsRole(client, 'HOSPITAL_SUPER_ADMIN');
    results['SuperAdmin'] = await verifyPortal(client, 'Super Admin', 'cleanup_02_superadmin');

    // Hospital Admin
    await loginAsRole(client, 'HOSPITAL_ADMIN');
    results['HospitalAdmin'] = await verifyPortal(client, 'Hospital Admin', 'cleanup_03_hospital_admin');

    // Receptionist
    await loginAsRole(client, 'RECEPTIONIST');
    results['Receptionist'] = await verifyPortal(client, 'Receptionist', 'cleanup_04_receptionist');

    // Doctor
    await loginAsRole(client, 'DOCTOR');
    results['Doctor'] = await verifyPortal(client, 'Doctor', 'cleanup_05_doctor');

    // Patient
    await loginAsRole(client, 'PATIENT');
    results['Patient'] = await verifyPortal(client, 'Patient', 'cleanup_06_patient');

    // ==========================================
    // 3. AUDIT MOBILE DRAWER (375px)
    // ==========================================
    console.log('\n--- AUDITING MOBILE DRAWER (375px) ---');
    await client.setViewport(375, 812, true);
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/patient' });
    await sleep(1500);

    const mobileOverflow = await client.eval(`
      (() => {
        const bodyWidth = document.body.offsetWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        return {
          bodyWidth,
          scrollWidth,
          innerWidth,
          hasOverflow: scrollWidth > innerWidth
        };
      })()
    `);
    console.log('[Mobile 375px] Viewport check:', JSON.stringify(mobileOverflow));
    await client.takeScreenshot('cleanup_07_mobile_patient_375.png');

    console.log('\n=== FINAL CLEANUP AUDIT COMPLETE ===');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Audit failed:', err);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    try { chromeProc.kill(); } catch (_) {}
  }
}

runAudit();
