const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'sidebar_and_registration');
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

  await client.eval(`
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
  `);

  // Click 1-click demo button for this role
  const clickedDemo = await client.eval(`
    (() => {
      const demoBtn = document.querySelector('button[data-demo-role="${roleKey}"]');
      if (demoBtn) {
        demoBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log(`[Demo Fill] ${roleKey} button clicked:`, clickedDemo);
  await sleep(500);

  // Click Submit
  await client.eval(`
    (() => {
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sign in') || b.innerText.toLowerCase().includes('log in') || b.innerText.includes('ప్రవేశించండి'));
      if (btn) btn.click();
    })()
  `);
  await sleep(3000);

  // Dismiss guide tour if present
  await client.eval(`
    (() => {
      const finishBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Got It') || b.innerText.includes('Skip') || b.innerText.includes('ప్రారంభిద్దాం') || b.innerText.includes('దాటవేయి'));
      if (finishBtn) finishBtn.click();
    })()
  `);
  await sleep(1000);
}

async function verifySidebarCollapse(client, portalName, prefix) {
  console.log(`\nVerifying Sidebar Collapse/Expand on ${portalName}...`);
  const currentUrl = await client.eval(`window.location.href`);
  console.log(`[${portalName}] Portal URL:`, currentUrl);

  // 1. Ensure expanded state first
  await client.eval(`
    (() => {
      try {
        localStorage.setItem('mediconnect_sidebar_collapsed', 'false');
        window.dispatchEvent(new Event('storage'));
      } catch(e){}
    })();
  `);
  await sleep(300);

  // Measure expanded sidebar width
  const expandedWidth = await client.eval(`
    (() => {
      const aside = document.querySelector('aside');
      return aside ? Math.round(aside.getBoundingClientRect().width) : 0;
    })();
  `);
  console.log(`[${portalName}] Expanded sidebar width: ${expandedWidth}px (expected ~240px)`);
  await client.takeScreenshot(`${prefix}_expanded.png`);

  // 2. Click collapse toggle
  const clickedCollapse = await client.eval(`
    (() => {
      const btn = document.querySelector('.sidebar-edge-toggle-btn') || 
                  document.querySelector('button[title*="Collapse"]') || 
                  document.querySelector('.desktop-collapse-control button');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })();
  `);
  console.log(`[${portalName}] Clicked collapse toggle: ${clickedCollapse}`);
  await sleep(500);

  // Measure collapsed sidebar width
  const collapsedWidth = await client.eval(`
    (() => {
      const aside = document.querySelector('aside');
      return aside ? Math.round(aside.getBoundingClientRect().width) : 0;
    })();
  `);
  console.log(`[${portalName}] Collapsed sidebar width: ${collapsedWidth}px (expected ~70px)`);
  await client.takeScreenshot(`${prefix}_collapsed.png`);

  // Check localStorage persistence
  const savedState = await client.eval(`localStorage.getItem('mediconnect_sidebar_collapsed')`);
  console.log(`[${portalName}] Persisted in localStorage: "${savedState}" (expected "true")`);

  // 3. Click expand toggle to restore
  const clickedExpand = await client.eval(`
    (() => {
      const btn = document.querySelector('.sidebar-edge-toggle-btn') || 
                  document.querySelector('button[title*="Expand"]') || 
                  document.querySelector('.desktop-collapse-control button');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })();
  `);
  await sleep(500);

  const restoredWidth = await client.eval(`
    (() => {
      const aside = document.querySelector('aside');
      return aside ? Math.round(aside.getBoundingClientRect().width) : 0;
    })();
  `);
  console.log(`[${portalName}] Restored sidebar width: ${restoredWidth}px (expected ~240px)`);

  return {
    portalName,
    url: currentUrl,
    expandedWidth,
    collapsedWidth,
    restoredWidth,
    persisted: savedState === 'true',
    verified: expandedWidth >= 230 && collapsedWidth <= 75
  };
}

async function runVerification() {
  console.log('=== STARTING SIDEBAR COLLAPSE & REGISTRATION UX AUDIT ===');
  const userDir = path.resolve(__dirname, 'qa_reports', 'chrome_collapse_audit_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--headless=new',
    'http://127.0.0.1:5173/register'
  ], { stdio: 'ignore' });

  let client = null;
  const auditSummary = {};

  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const version = await getJson('http://127.0.0.1:9222/json/version');
        console.log('[CDP] Chrome ready:', version.Browser);
        connected = true;
        break;
      } catch (_) {}
    }
    if (!connected) throw new Error('Failed to connect to Chrome debugging port 9222');

    const targets = await getJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    // ========================================================
    // TEST 1: REGISTRATION PAGE UX (Desktop 1440px)
    // ========================================================
    console.log('\n--- 1. PATIENT REGISTRATION PAGE AUDIT (DESKTOP) ---');
    await client.setViewport(1440, 900, false);
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/register' });
    await sleep(1500);

    const regDetails = await client.eval(`
      (() => {
        const backBtn = document.querySelector('.register-back-btn');
        const eyeButtons = document.querySelectorAll('button[aria-label*="password"], button[aria-label*="Password"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const alreadyAccountLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/login'));
        return {
          hasBackBtn: Boolean(backBtn),
          backBtnText: backBtn ? backBtn.innerText.trim() : null,
          eyeButtonsCount: eyeButtons.length,
          passwordInputsCount: passwordInputs.length,
          hasAlreadyAccountLink: Boolean(alreadyAccountLink)
        };
      })()
    `);
    console.log('[Register] Details:', JSON.stringify(regDetails, null, 2));
    await client.takeScreenshot('sidebar_and_reg_01_register_desktop.png');

    // Test Password Eye Toggle
    await client.eval(`
      (() => {
        const passInputs = document.querySelectorAll('input[type="password"]');
        if (passInputs[0]) passInputs[0].value = 'Secret123';
        const eyeBtn = document.querySelector('button[aria-label*="password"], button[aria-label*="Password"]');
        if (eyeBtn) eyeBtn.click();
      })()
    `);
    await sleep(300);
    const passInputType = await client.eval(`document.querySelectorAll('input')[document.querySelectorAll('input').length - 2]?.type`);
    console.log(`[Register] Password input type after eye toggle: "${passInputType}" (expected "text")`);

    // Test Back to Login navigation
    console.log('\n--- 2. BACK TO LOGIN NAVIGATION TEST ---');
    await client.eval(`
      (() => {
        const backBtn = document.querySelector('.register-back-btn');
        if (backBtn) backBtn.click();
      })()
    `);
    await sleep(1500);
    const loginUrl = await client.eval(`window.location.href`);
    console.log('[Login] Navigated URL:', loginUrl);
    await client.takeScreenshot('sidebar_and_reg_02_login_patient_with_reg_link.png');

    // Test Registration on Mobile Viewports (375px & 390px)
    console.log('\n--- 3. REGISTRATION RESPONSIVE VIEWPORT TESTS (375px & 390px) ---');
    await client.setViewport(375, 812, true);
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/register' });
    await sleep(1500);

    const mobileOverflow375 = await client.eval(`
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
    console.log('[Register 375px] Viewport check:', JSON.stringify(mobileOverflow375));
    await client.takeScreenshot('sidebar_and_reg_03_register_mobile_375.png');

    // ========================================================
    // TEST 4: ALL 6 PORTALS SIDEBAR COLLAPSE / EXPAND
    // ========================================================
    await client.setViewport(1440, 900, false);

    // PORTAL 1: Platform Owner
    await loginAsRole(client, 'PLATFORM_OWNER');
    auditSummary['Owner'] = await verifySidebarCollapse(client, 'Platform Owner', 'sidebar_01_owner');

    // PORTAL 2: Super Admin
    await loginAsRole(client, 'HOSPITAL_SUPER_ADMIN');
    auditSummary['SuperAdmin'] = await verifySidebarCollapse(client, 'Super Admin', 'sidebar_02_superadmin');

    // PORTAL 3: Hospital Admin
    await loginAsRole(client, 'HOSPITAL_ADMIN');
    auditSummary['HospitalAdmin'] = await verifySidebarCollapse(client, 'Hospital Admin', 'sidebar_03_hospital_admin');

    // PORTAL 4: Receptionist
    await loginAsRole(client, 'RECEPTIONIST');
    auditSummary['Receptionist'] = await verifySidebarCollapse(client, 'Receptionist', 'sidebar_04_receptionist');

    // PORTAL 5: Doctor
    await loginAsRole(client, 'DOCTOR');
    auditSummary['Doctor'] = await verifySidebarCollapse(client, 'Doctor', 'sidebar_05_doctor');

    // PORTAL 6: Patient
    await loginAsRole(client, 'PATIENT');
    auditSummary['Patient'] = await verifySidebarCollapse(client, 'Patient', 'sidebar_06_patient');

    // ========================================================
    // TEST 5: MOBILE OFF-CANVAS DRAWER VERIFICATION
    // ========================================================
    console.log('\n--- 5. MOBILE DRAWER VERIFICATION (375px) ---');
    await client.setViewport(375, 812, true);
    await sleep(600);
    // Open hamburger drawer
    await client.eval(`
      (() => {
        const hamburger = document.querySelector('button[aria-label*="navigation"], button[aria-label*="menu"]') ||
                          Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg'));
        if (hamburger) hamburger.click();
      })()
    `);
    await sleep(600);
    await client.takeScreenshot('sidebar_07_mobile_drawer_open.png');

    console.log('\n=== AUDIT COMPLETE ===');
    console.log(JSON.stringify(auditSummary, null, 2));

  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    if (client) await client.close();
    try {
      chromeProc.kill('SIGTERM');
    } catch (_) {}
    try {
      fs.rmSync(userDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

runVerification();
