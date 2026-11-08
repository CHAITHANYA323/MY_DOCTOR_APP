const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');
const CHROME_PATH = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PERSONAS = [
  {
    role: 'PLATFORM_OWNER',
    name: 'Platform Owner',
    email: 'owner@mediconnect.com',
    password: 'Owner@123',
    dashboardUrl: 'http://127.0.0.1:5173/owner',
    dashboardFile: 'platform-owner-dashboard.png',
    secondaryUrl: 'http://127.0.0.1:5173/owner/hospitals',
    secondaryFile: 'platform-owner-hospitals.png',
  },
  {
    role: 'HOSPITAL_SUPER_ADMIN',
    name: 'Hospital Super Admin',
    email: 'admin.hosp1@medicare.com',
    password: 'Admin@123',
    dashboardUrl: 'http://127.0.0.1:5173/superadmin',
    dashboardFile: 'hospital-admin-dashboard.png',
    secondaryUrl: 'http://127.0.0.1:5173/superadmin/staff',
    secondaryFile: 'hospital-admin-staff.png',
  },
  {
    role: 'RECEPTIONIST',
    name: 'Receptionist',
    email: 'reception.hosp1@medicare.com',
    password: 'Reception@123',
    dashboardUrl: 'http://127.0.0.1:5173/admin',
    dashboardFile: 'receptionist-dashboard.png',
    secondaryUrl: 'http://127.0.0.1:5173/admin/check-in',
    secondaryFile: 'receptionist-checkin.png',
  },
  {
    role: 'DOCTOR',
    name: 'Doctor',
    email: 'dr.one@medicare.com',
    password: 'Doctor@123',
    dashboardUrl: 'http://127.0.0.1:5173/doctor',
    dashboardFile: 'doctor-dashboard.png',
    secondaryUrl: 'http://127.0.0.1:5173/doctor/schedule',
    secondaryFile: 'doctor-schedule.png',
  },
  {
    role: 'PATIENT',
    name: 'Patient',
    email: 'patient.alpha@test.com',
    password: 'Patient@123',
    dashboardUrl: 'http://127.0.0.1:5173/patient',
    dashboardFile: 'patient-dashboard.png',
    secondaryUrl: 'http://127.0.0.1:5173/patient/appointments',
    secondaryFile: 'patient-appointments.png',
  },
];

let backendProc = null;
let frontendProc = null;
let chromeProc = null;
let ws = null;
let messageId = 1;
const pendingCalls = new Map();
const consoleErrors = [];
const auditResults = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendCDP(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = messageId++;
    pendingCalls.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await sendCDP('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
  }
  return res.result?.value;
}

async function waitForSelector(selector, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const exists = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
      if (exists) return true;
    } catch {}
    await sleep(300);
  }
  const bodyText = await evaluate('document.body ? document.body.innerText.slice(0, 200) : "no-body"');
  throw new Error(`Timeout waiting for selector "${selector}". Current body text: "${bodyText}"`);
}

async function captureScreenshot(filename) {
  const targetPath = path.join(SCREENSHOT_DIR, filename);
  const res = await sendCDP('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(targetPath, Buffer.from(res.data, 'base64'));
  const sizeKb = (fs.statSync(targetPath).size / 1024).toFixed(1);
  console.log(`    [CAPTURED] ${filename} (${sizeKb} KB)`);
  return { path: targetPath, sizeKb };
}

async function pollUrl(url, maxAttempts = 30, delayMs = 1000) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'text/html,application/json' } });
      if (res.ok || res.status === 200 || res.status === 304) {
        return true;
      }
    } catch (e) {
      // Retry
    }
    await sleep(delayMs);
  }
  return false;
}

async function startServers() {
  console.log('[1/4] Starting demonstration servers (Waitress & Vite)...');

  // Start Waitress Backend
  backendProc = spawn('python', ['-m', 'waitress', '--port=5000', '--host=127.0.0.1', '--threads=4', 'app:app'], {
    cwd: path.join(ROOT_DIR, 'backend'),
    shell: true,
  });

  // Start Vite Frontend with explicit 127.0.0.1 host binding
  frontendProc = spawn('npm.cmd', ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: path.join(ROOT_DIR, 'frontend'),
    shell: true,
  });

  console.log('  Waiting for Backend on http://127.0.0.1:5000/api/health ...');
  const backendReady = await pollUrl('http://127.0.0.1:5000/api/health', 25, 1000);
  if (!backendReady) {
    throw new Error('Backend failed to start on port 5000 within 25 seconds.');
  }
  console.log('  [OK] Backend health endpoint responded HTTP 200.');

  console.log('  Waiting for Frontend on http://127.0.0.1:5173/ ...');
  const frontendReady = await pollUrl('http://127.0.0.1:5173/', 25, 1000);
  if (!frontendReady) {
    throw new Error('Frontend Vite dev server failed to respond on port 5173 within 25 seconds.');
  }
  console.log('  [OK] Frontend server responded HTTP 200.');
}

async function initChromeCDP() {
  console.log('[2/4] Launching Headless Chrome with CDP debugging...');
  const tmpProfile = path.join(os.tmpdir(), `chrome_mediconnect_${Date.now()}`);
  chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tmpProfile}`,
    '--window-size=1366,768',
    'about:blank',
  ]);

  await sleep(2000);

  const tabsRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await tabsRes.json();
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  if (!pageTab || !pageTab.webSocketDebuggerUrl) {
    throw new Error('Could not find active Chrome page tab in CDP list.');
  }

  ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.id && pendingCalls.has(msg.id)) {
        const { resolve, reject } = pendingCalls.get(msg.id);
        pendingCalls.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        if (type === 'error' && !text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    } catch (err) {
      console.error('[WS Error]', err);
    }
  };

  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');
  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log('  [OK] Chrome CDP connected. Viewport set to 1366x768 (Desktop Standard).');
}

async function runVisualAudit() {
  console.log('\n[3/4] Performing Portal Visual Inspections & Capturing Screenshots...\n');

  // 1. Capture Login Page
  console.log('--- 1. Login Page Verification ---');
  await sendCDP('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
  await waitForSelector('input[type="email"]');
  await sleep(1500);

  const loginTitle = await evaluate('document.title');
  const buttonCount = await evaluate('document.querySelectorAll("button").length');
  const loginBrokenImages = await evaluate('Array.from(document.querySelectorAll("img")).filter(i => i.naturalWidth === 0).length');

  const loginShot = await captureScreenshot('login-page.png');
  auditResults.push({
    portal: 'Login Page',
    route: '/login',
    filename: 'login-page.png',
    sizeKb: loginShot.sizeKb,
    status: buttonCount >= 5 && loginBrokenImages === 0 ? 'PASS' : 'WARN',
    notes: `Title: "${loginTitle}", Buttons: ${buttonCount}, Broken Imgs: ${loginBrokenImages}`,
  });

  // 2. Capture Each Role Dashboard and Secondary Feature Page
  for (const persona of PERSONAS) {
    console.log(`\n--- ${persona.name} (${persona.role}) ---`);

    // Perform authenticated API login
    const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: persona.email, password: persona.password }),
    });
    const authData = await loginRes.json();
    if (!authData.success || !authData.token) {
      throw new Error(`Authentication failed for ${persona.email}: ${JSON.stringify(authData)}`);
    }

    // Navigate to /login first to ensure clean execution context before setting storage
    await sendCDP('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
    await sleep(800);

    // Set credentials into localStorage
    await evaluate(`
      localStorage.setItem('medicare_token', ${JSON.stringify(authData.token)});
      localStorage.setItem('medicare_user', ${JSON.stringify(JSON.stringify(authData.user))});
    `);

    // Navigate to role dashboard via Page.navigate
    console.log(`  Navigating to Dashboard: ${persona.dashboardUrl} ...`);
    await sendCDP('Page.navigate', { url: persona.dashboardUrl });
    await waitForSelector('h1, h2, h3, aside, nav, .stat-card, .dashboard-container');
    await sleep(2500); // Allow react data-fetch and chart animation to settle

    const dashTitle = await evaluate('document.querySelector("h1, h2")?.innerText || document.title');
    const dashTextLength = await evaluate('document.body.innerText.length');
    const dashBrokenImgs = await evaluate('Array.from(document.querySelectorAll("img")).filter(i => i.naturalWidth === 0).length');

    const dashShot = await captureScreenshot(persona.dashboardFile);
    auditResults.push({
      portal: `${persona.name} Dashboard`,
      route: persona.dashboardUrl.replace('http://127.0.0.1:5173', ''),
      filename: persona.dashboardFile,
      sizeKb: dashShot.sizeKb,
      status: dashTextLength > 100 && dashBrokenImgs === 0 ? 'PASS' : 'WARN',
      notes: `Heading: "${dashTitle.replace(/\n/g, ' ').slice(0, 40)}", Text: ${dashTextLength} chars`,
    });

    // Secondary Feature Screen
    console.log(`  Navigating to Secondary Page: ${persona.secondaryUrl} ...`);
    await sendCDP('Page.navigate', { url: persona.secondaryUrl });
    await waitForSelector('h1, h2, h3, table, nav, aside, form, button');
    await sleep(2500);

    const secTitle = await evaluate('document.querySelector("h1, h2")?.innerText || document.title');
    const secTextLength = await evaluate('document.body.innerText.length');
    const secBrokenImgs = await evaluate('Array.from(document.querySelectorAll("img")).filter(i => i.naturalWidth === 0).length');

    const secShot = await captureScreenshot(persona.secondaryFile);
    auditResults.push({
      portal: `${persona.name} Sub-Page`,
      route: persona.secondaryUrl.replace('http://127.0.0.1:5173', ''),
      filename: persona.secondaryFile,
      sizeKb: secShot.sizeKb,
      status: secTextLength > 100 && secBrokenImgs === 0 ? 'PASS' : 'WARN',
      notes: `Heading: "${secTitle.replace(/\n/g, ' ').slice(0, 40)}", Text: ${secTextLength} chars`,
    });

    // Logout and clear session
    await evaluate(`
      localStorage.removeItem('medicare_token');
      localStorage.removeItem('medicare_user');
    `);
    await sleep(300);
  }
}

async function cleanup() {
  console.log('\n[4/4] Shutting down demo servers & Chrome...');
  if (ws) {
    try { ws.close(); } catch {}
  }
  if (chromeProc) {
    try { chromeProc.kill('SIGTERM'); } catch {}
  }

  // Use the safe stop_demo script to cleanly terminate server processes
  try {
    execSync('python backend/stop_demo.py', { cwd: ROOT_DIR, stdio: 'ignore' });
  } catch (err) {
    // Ignore fallback
  }

  console.log('  [OK] All demo processes stopped cleanly.');
}

async function main() {
  try {
    await startServers();
    await initChromeCDP();
    await runVisualAudit();
  } finally {
    await cleanup();
  }

  console.log('\n' + '='.repeat(85));
  console.log('              STEP 10.1 SCREENSHOT COLLECTION & VERIFICATION SUMMARY');
  console.log('='.repeat(85));
  console.log(
    'Portal / Screen'.padEnd(28) +
    'Route'.padEnd(25) +
    'File'.padEnd(30) +
    'Size'.padEnd(10) +
    'Status'
  );
  console.log('-'.repeat(85));

  for (const item of auditResults) {
    console.log(
      item.portal.padEnd(28) +
      item.route.padEnd(25) +
      item.filename.padEnd(30) +
      `${item.sizeKb} KB`.padEnd(10) +
      `[${item.status}]`
    );
  }

  console.log('-'.repeat(85));
  console.log(`Total Screenshots Captured: ${auditResults.length} / 11`);
  console.log(`Console Errors Logged:     ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 5).forEach((e, idx) => console.log(`  [Error ${idx+1}] ${e}`));
  }
  console.log('='.repeat(85));
}

main().catch(err => {
  console.error('\n[FATAL ERROR]', err);
  cleanup().finally(() => process.exit(1));
});
