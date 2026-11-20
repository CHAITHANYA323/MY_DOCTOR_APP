const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'superadmin_and_owner');
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
    console.log(`[CDP] Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }
}

async function runTests() {
  console.log('[Test] Starting Chrome for SuperAdmin & Owner E2E verification...');
  const userDataDir = path.resolve(__dirname, 'qa_reports', 'chrome_cdp_profile_admin');
  
  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=${userDataDir}`,
    'http://127.0.0.1:5173/login'
  ], { stdio: 'ignore' });

  let client = null;
  try {
    let connected = false;
    let wsUrl = '';
    for (let i = 0; i < 30; i++) {
      try {
        const tabs = await getJson('http://127.0.0.1:9222/json');
        if (Array.isArray(tabs) && tabs.length > 0) {
          const target = tabs.find(t => t.type === 'page') || tabs[0];
          wsUrl = target.webSocketDebuggerUrl;
          if (wsUrl) {
            connected = true;
            break;
          }
        }
      } catch (_) {}
      await sleep(500);
    }

    if (!connected || !wsUrl) {
      throw new Error('Failed to connect to Chrome CDP debugging port 9222');
    }

    client = new CDPClient(wsUrl);
    await client.connect();
    console.log('[CDP] Connected successfully.');

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');

    // ==========================================
    // PART A: SUPER ADMIN PORTAL
    // ==========================================
    console.log('\n--- PART A: SUPER ADMIN TESTING ---');
    await client.setViewport(1440, 900, false);

    // 1. Clear session and local storage
    await client.eval(`
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'http://127.0.0.1:5173/login';
    `);
    await sleep(2000);

    // 2. Log in as Super Admin
    console.log('[Test] Logging in as Super Admin: admin.hosp1@medicare.com...');
    await client.eval(`
      const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelectorAll('input')[0];
      const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]') || document.querySelectorAll('input')[1];
      
      const setVal = (input, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      
      setVal(emailInput, 'admin.hosp1@medicare.com');
      setVal(passInput, 'SuperAdmin@123');
    `);
    await sleep(600);

    // Click submit
    await client.eval(`
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sign in') || b.innerText.toLowerCase().includes('log in'));
      if (btn) btn.click();
    `);
    await sleep(2500);

    // Verify redirected to /superadmin
    const currentUrl1 = await client.eval(`window.location.href`);
    console.log('[Test] Navigated to:', currentUrl1);

    // 3. Capture Guided Walkthrough Tour Modal on Super Admin Dashboard
    console.log('[Test] Verifying Super Admin Walkthrough Tour Modal...');
    await sleep(1000);
    await client.takeScreenshot('01_superadmin_guided_tour_modal.png');

    // Click through the guide steps
    await client.eval(`
      // Find Next button or Step pills
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next') || b.innerText.includes('తరువాత'));
      if (nextBtn) nextBtn.click();
    `);
    await sleep(500);

    // Click finish or close on the modal
    await client.eval(`
      const finishBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Got It') || b.innerText.includes('Skip') || b.innerText.includes('ప్రారంభిద్దాం') || b.innerText.includes('దాటవేయి'));
      if (finishBtn) finishBtn.click();
    `);
    await sleep(1000);

    // 4. English Super Admin Dashboard (8 action cards, 7 stats, plain language)
    console.log('[Test] Verifying English Super Admin Dashboard...');
    await client.takeScreenshot('02_superadmin_dashboard_en.png');

    // 5. Toggle Language to Telugu
    console.log('[Test] Toggling to Telugu on Super Admin Dashboard...');
    await client.eval(`
      const teBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('తెలుగు'));
      if (teBtn) teBtn.click();
    `);
    await sleep(1000);
    await client.takeScreenshot('03_superadmin_dashboard_te.png');

    // Switch back to English
    await client.eval(`
      const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('English'));
      if (enBtn) enBtn.click();
    `);
    await sleep(1000);

    // 6. Super Admin Staff Management (/superadmin/staff)
    console.log('[Test] Navigating to /superadmin/staff...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/superadmin/staff';`);
    await sleep(2000);
    await client.takeScreenshot('04_superadmin_staff_management.png');

    // 7. Super Admin Reports (/superadmin/reports)
    console.log('[Test] Navigating to /superadmin/reports...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/superadmin/reports';`);
    await sleep(2000);
    await client.takeScreenshot('05_superadmin_reports.png');

    // 8. Super Admin Settings (/superadmin/settings)
    console.log('[Test] Navigating to /superadmin/settings...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/superadmin/settings';`);
    await sleep(2000);
    await client.takeScreenshot('06_superadmin_settings.png');

    // 9. Responsive Tablet 768px (Super Admin Dashboard)
    console.log('[Test] Checking Tablet 768px responsive layout...');
    await client.setViewport(768, 1024, false);
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/superadmin';`);
    await sleep(2000);
    await client.takeScreenshot('07_superadmin_dashboard_tablet_768.png');

    // 10. Responsive Mobile 375px (Super Admin Dashboard)
    console.log('[Test] Checking Mobile 375px responsive layout...');
    await client.setViewport(375, 812, true);
    await sleep(1000);
    await client.takeScreenshot('08_superadmin_dashboard_mobile_375.png');

    // ==========================================
    // PART B: PLATFORM OWNER PORTAL
    // ==========================================
    console.log('\n--- PART B: PLATFORM OWNER TESTING ---');
    await client.setViewport(1440, 900, false);

    // 11. Clear storage and navigate to login
    await client.eval(`
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'http://127.0.0.1:5173/login';
    `);
    await sleep(2000);

    // 12. Log in as Platform Owner
    console.log('[Test] Logging in as Platform Owner: owner@mediconnect.com...');
    await client.eval(`
      const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelectorAll('input')[0];
      const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]') || document.querySelectorAll('input')[1];
      
      const setVal = (input, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      
      setVal(emailInput, 'owner@mediconnect.com');
      setVal(passInput, 'Owner@123');
    `);
    await sleep(600);

    // Click submit
    await client.eval(`
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sign in') || b.innerText.toLowerCase().includes('log in'));
      if (btn) btn.click();
    `);
    await sleep(2500);

    // Verify redirected to /owner
    const currentUrl2 = await client.eval(`window.location.href`);
    console.log('[Test] Navigated to:', currentUrl2);

    // 13. Platform Owner Guided Tour Modal
    console.log('[Test] Verifying Platform Owner Walkthrough Tour Modal...');
    await sleep(1000);
    await client.takeScreenshot('09_owner_guided_tour_modal.png');

    // Dismiss tour
    await client.eval(`
      const finishBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Got It') || b.innerText.includes('Skip') || b.innerText.includes('ప్రారంభిద్దాం') || b.innerText.includes('దాటవేయి'));
      if (finishBtn) finishBtn.click();
    `);
    await sleep(1000);

    // 14. Platform Owner Dashboard (English - 6 action cards, 6 stats, AP/TS hospitals)
    console.log('[Test] Verifying English Platform Owner Dashboard...');
    await client.takeScreenshot('10_owner_dashboard_en.png');

    // 15. Toggle Language to Telugu
    console.log('[Test] Toggling to Telugu on Platform Owner Dashboard...');
    await client.eval(`
      const teBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('తెలుగు'));
      if (teBtn) teBtn.click();
    `);
    await sleep(1000);
    await client.takeScreenshot('11_owner_dashboard_te.png');

    // Switch back to English
    await client.eval(`
      const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('English'));
      if (enBtn) enBtn.click();
    `);
    await sleep(1000);

    // 16. Manage Platform Hospitals (/owner/hospitals)
    console.log('[Test] Navigating to /owner/hospitals...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner/hospitals';`);
    await sleep(2000);
    await client.takeScreenshot('12_owner_manage_hospitals.png');

    // 17. Super Admin Invitations (/owner/invitations)
    console.log('[Test] Navigating to /owner/invitations...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner/invitations';`);
    await sleep(2000);
    await client.takeScreenshot('13_owner_invitations.png');

    // 18. Security Audit Logs (/owner/audit-logs)
    console.log('[Test] Navigating to /owner/audit-logs...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner/audit-logs';`);
    await sleep(2000);
    await client.takeScreenshot('14_owner_audit_logs.png');

    // 19. Responsive Tablet 768px (Owner Dashboard)
    console.log('[Test] Checking Tablet 768px responsive layout (Owner)...');
    await client.setViewport(768, 1024, false);
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner';`);
    await sleep(2000);
    await client.takeScreenshot('15_owner_dashboard_tablet_768.png');

    // 20. Responsive Mobile 375px (Owner Dashboard)
    console.log('[Test] Checking Mobile 375px responsive layout (Owner)...');
    await client.setViewport(375, 812, true);
    await sleep(1000);
    await client.takeScreenshot('16_owner_dashboard_mobile_375.png');

    console.log('\n[SUCCESS] All 16 QA screenshots captured successfully!');
  } catch (err) {
    console.error('[Error during QA test execution]:', err);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    chromeProc.kill();
  }
}

runTests();

