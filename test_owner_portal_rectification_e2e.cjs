const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'owner_rectification');
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
  console.log('[Test] Starting Chrome for Platform Owner Portal Rectification verification...');
  const userDir = path.resolve(__dirname, 'qa_reports', 'chrome_owner_profile_' + Date.now());

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
  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const version = await getJson('http://127.0.0.1:9222/json/version');
        console.log('[CDP] Chrome reachable. Browser:', version.Browser);
        connected = true;
        break;
      } catch (_) {}
    }
    if (!connected) throw new Error('Could not connect to Chrome debugging port 9222');

    const targets = await getJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    console.log('[CDP] Connected via WebSocket');

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    // 1. Initial Desktop Viewport 1440x900
    await client.setViewport(1440, 900, false);
    await client.eval(`
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'http://127.0.0.1:5173/login';
    `);
    await sleep(2500);

    // 2. Log in as Platform Owner
    console.log('[Test] Logging in as Platform Owner (owner@mediconnect.com)...');
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
    await sleep(500);

    await client.eval(`
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sign in') || b.innerText.toLowerCase().includes('log in'));
      if (btn) btn.click();
    `);
    await sleep(3000);

    // 3. First-Time Guided Walkthrough Modal
    console.log('[Test] Capturing Guided Tour Walkthrough Modal...');
    await client.takeScreenshot('after_01_tour_modal.png');

    // Dismiss tour
    await client.eval(`
      const finishBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Got It') || b.innerText.includes('Skip') || b.innerText.includes('ప్రారంభిద్దాం') || b.innerText.includes('దాటవేయి'));
      if (finishBtn) finishBtn.click();
    `);
    await sleep(1200);

    // 4. Rectified Owner Dashboard (English - 1440px)
    console.log('[Test] Capturing Rectified Owner Dashboard (English)...');
    await client.takeScreenshot('after_02_dashboard_en.png');

    // 5. Toggle Language to Telugu
    console.log('[Test] Toggling to Telugu on Owner Dashboard...');
    await client.eval(`
      const teBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('తెలుగు'));
      if (teBtn) teBtn.click();
    `);
    await sleep(1200);
    await client.takeScreenshot('after_03_dashboard_te.png');

    // Switch back to English
    await client.eval(`
      const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('English'));
      if (enBtn) enBtn.click();
    `);
    await sleep(1000);

    // 6. Add or Review Hospitals (/owner/hospitals)
    console.log('[Test] Navigating to /owner/hospitals...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner/hospitals';`);
    await sleep(2500);
    await client.takeScreenshot('after_04_hospitals.png');

    // Test State Filter on Hospitals page
    console.log('[Test] Testing State filter on Hospitals page...');
    await client.eval(`
      const selects = document.querySelectorAll('select');
      for (const sel of selects) {
        if (Array.from(sel.options).some(o => o.value === 'Telangana')) {
          sel.value = 'Telangana';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    `);
    await sleep(1000);
    await client.takeScreenshot('after_04b_hospitals_filtered.png');

    // Switch to Pending Requests tab
    console.log('[Test] Switching to Requests tab on Hospitals page...');
    await client.eval(`
      const reqTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Requests Waiting') || b.innerText.includes('ఆమోదం కోసం'));
      if (reqTab) reqTab.click();
    `);
    await sleep(1000);
    await client.takeScreenshot('after_04c_hospitals_requests_tab.png');

    // 7. Invite Hospital Administrators (/owner/invitations)
    console.log('[Test] Navigating to /owner/invitations...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner/invitations';`);
    await sleep(2500);
    await client.takeScreenshot('after_05_invitations.png');

    // Open Revoke Confirmation modal
    console.log('[Test] Opening Revoke Confirmation modal...');
    await client.eval(`
      const revokeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('revoke'));
      if (revokeBtn) revokeBtn.click();
    `);
    await sleep(1000);
    await client.takeScreenshot('after_05b_invitations_revoke_modal.png');

    // Dismiss modal
    await client.eval(`
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase() === 'cancel');
      if (cancelBtn) cancelBtn.click();
    `);
    await sleep(600);

    // 8. Platform Activity History (/owner/audit-logs)
    console.log('[Test] Navigating to /owner/audit-logs...');
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner/audit-logs';`);
    await sleep(2500);
    await client.takeScreenshot('after_06_audit_logs.png');

    // 9. Responsive Laptop View: 1366px
    console.log('[Test] Checking Laptop 1366px responsive layout...');
    await client.setViewport(1366, 768, false);
    await client.eval(`window.location.href = 'http://127.0.0.1:5173/owner';`);
    await sleep(2500);
    await client.takeScreenshot('after_07_laptop_1366.png');

    // 10. Responsive Tablet View: 768px
    console.log('[Test] Checking Tablet 768px responsive layout...');
    await client.setViewport(768, 1024, false);
    await sleep(1500);
    await client.takeScreenshot('after_08_tablet_768.png');

    // 11. Responsive Mobile View: 375px
    console.log('[Test] Checking Mobile 375px responsive layout...');
    await client.setViewport(375, 812, true);
    await sleep(1500);
    await client.takeScreenshot('after_09_mobile_375.png');

    // Open mobile sidebar drawer
    await client.eval(`
      const trigger = document.querySelector('.mobile-menu-trigger');
      if (trigger) trigger.click();
    `);
    await sleep(1000);
    await client.takeScreenshot('after_10_mobile_sidebar_drawer.png');

    console.log('\n[SUCCESS] All Platform Owner Portal QA screenshots captured successfully!');
  } catch (err) {
    console.error('[Error during tests]:', err);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    chromeProc.kill('SIGKILL');
    try {
      fs.rmSync(userDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

runTests();

