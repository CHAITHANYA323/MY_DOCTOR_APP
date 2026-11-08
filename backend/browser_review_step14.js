const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

const PORTAL_AUDITS = [
  {
    roleKey: 'PLATFORM_OWNER',
    roleName: 'Platform Owner',
    email: 'owner@mediconnect.com',
    password: 'Owner@123',
    primaryUrl: 'http://127.0.0.1:5173/owner',
    secondaryUrl: 'http://127.0.0.1:5173/owner/hospitals',
    tertiaryUrl: 'http://127.0.0.1:5173/owner/audit-logs',
    forbiddenUrl: 'http://127.0.0.1:5173/doctor',
    expectedHeader: 'Platform',
  },
  {
    roleKey: 'HOSPITAL_SUPER_ADMIN',
    roleName: 'Hospital Super Admin',
    email: 'admin.hosp1@medicare.com',
    password: 'Admin@123',
    primaryUrl: 'http://127.0.0.1:5173/superadmin',
    secondaryUrl: 'http://127.0.0.1:5173/superadmin/staff',
    tertiaryUrl: 'http://127.0.0.1:5173/superadmin/doctors',
    forbiddenUrl: 'http://127.0.0.1:5173/owner',
    expectedHeader: 'Hospital',
  },
  {
    roleKey: 'RECEPTIONIST',
    roleName: 'Receptionist',
    email: 'reception.hosp1@medicare.com',
    password: 'Reception@123',
    primaryUrl: 'http://127.0.0.1:5173/admin',
    secondaryUrl: 'http://127.0.0.1:5173/admin/check-in',
    tertiaryUrl: 'http://127.0.0.1:5173/admin/appointments',
    forbiddenUrl: 'http://127.0.0.1:5173/superadmin',
    expectedHeader: 'Reception',
  },
  {
    roleKey: 'DOCTOR',
    roleName: 'Doctor',
    email: 'dr.one@medicare.com',
    password: 'Doctor@123',
    primaryUrl: 'http://127.0.0.1:5173/doctor',
    secondaryUrl: 'http://127.0.0.1:5173/doctor/schedule',
    tertiaryUrl: 'http://127.0.0.1:5173/doctor/appointments',
    forbiddenUrl: 'http://127.0.0.1:5173/owner',
    expectedHeader: 'Doctor',
  },
  {
    roleKey: 'PATIENT',
    roleName: 'Patient',
    email: 'patient.alpha@test.com',
    password: 'Patient@123',
    primaryUrl: 'http://127.0.0.1:5173/patient',
    secondaryUrl: 'http://127.0.0.1:5173/doctors',
    tertiaryUrl: 'http://127.0.0.1:5173/patient/appointments',
    forbiddenUrl: 'http://127.0.0.1:5173/owner',
    expectedHeader: 'Patient',
  },
];

let backendProc = null;
let frontendProc = null;
let chromeProc = null;
let ws = null;
let messageId = 1;
const pendingCalls = new Map();
const consoleErrors = [];
const networkErrors = [];
const auditResults = [];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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
    await sleep(250);
  }
  return false;
}

async function pollUrl(url, maxAttempts = 30, delayMs = 1000) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'text/html,application/json' } });
      if (res.ok || res.status === 200 || res.status === 304) {
        return true;
      }
    } catch (e) {}
    await sleep(delayMs);
  }
  return false;
}

async function startServers() {
  console.log('[1/4] Starting demonstration services (Waitress WSGI & Vite)...');
  backendProc = spawn('python', ['-m', 'waitress', '--port=5000', '--host=127.0.0.1', '--threads=4', 'app:app'], {
    cwd: path.join(ROOT_DIR, 'backend'),
    shell: true,
  });

  frontendProc = spawn('npm.cmd', ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: path.join(ROOT_DIR, 'frontend'),
    shell: true,
  });

  console.log('  Waiting for Backend health endpoint (http://127.0.0.1:5000/api/health)...');
  const bReady = await pollUrl('http://127.0.0.1:5000/api/health', 25, 1000);
  if (!bReady) throw new Error('Waitress backend failed to start.');
  console.log('  [OK] Backend health check: HTTP 200.');

  console.log('  Waiting for Frontend server (http://127.0.0.1:5173/)...');
  const fReady = await pollUrl('http://127.0.0.1:5173/', 25, 1000);
  if (!fReady) throw new Error('Vite frontend failed to start.');
  console.log('  [OK] Frontend server: HTTP 200.');
}

async function initChrome() {
  console.log('[2/4] Launching Google Chrome (Headless New, 1366x768 viewport)...');
  const tmpProfile = path.join(os.tmpdir(), `chrome_step14_${Date.now()}`);
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
      } else if (msg.method === 'Network.responseReceived') {
        const resp = msg.params.response;
        if (resp && resp.status >= 400 && !resp.url.includes('favicon.ico')) {
          networkErrors.push(`${resp.status} on ${resp.url}`);
        }
      }
    } catch (err) {}
  };

  await new Promise(r => ws.onopen = r);
  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');
  await sendCDP('Network.enable');
  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log('  [OK] Chrome CDP connected. Viewport: 1366x768.\n');
}

async function reviewPage(roleName, pageLabel, url) {
  console.log(`  Evaluating [${roleName}] ${pageLabel}: ${url}`);
  await sendCDP('Page.navigate', { url });
  await waitForSelector('h1, h2, h3, nav, aside, table, form, .card, .dashboard-container');
  await sleep(2200);

  const pageMetrics = await evaluate(`({
    title: document.title,
    heading: document.querySelector('h1, h2, h3')?.innerText || 'No Heading',
    bodyLength: document.body ? document.body.innerText.length : 0,
    buttonCount: document.querySelectorAll('button').length,
    inputCount: document.querySelectorAll('input, select, textarea').length,
    tableCount: document.querySelectorAll('table').length,
    tableRows: document.querySelectorAll('tr').length,
    brokenImages: Array.from(document.querySelectorAll('img')).filter(i => i.naturalWidth === 0).length,
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    currentUrl: window.location.href,
  })`);

  return pageMetrics;
}

async function runReview() {
  console.log('[3/4] Reviewing Login Page & All Five Role Portals...\n');

  // --- 1. LOGIN PAGE REVIEW ---
  console.log('--- Reviewing Login Page (/login) ---');
  const loginMetrics = await reviewPage('Public', 'Login Page', 'http://127.0.0.1:5173/login');
  console.log(`    Title: "${loginMetrics.title}"`);
  console.log(`    Buttons: ${loginMetrics.buttonCount} | Inputs: ${loginMetrics.inputCount} | Body Text: ${loginMetrics.bodyLength} chars`);
  console.log(`    Horizontal Overflow: ${loginMetrics.hasHorizontalOverflow} | Broken Images: ${loginMetrics.brokenImages}`);

  auditResults.push({
    role: 'Public Auth',
    screen: 'Login Screen',
    url: '/login',
    metrics: loginMetrics,
    status: loginMetrics.buttonCount >= 5 && loginMetrics.inputCount >= 2 && !loginMetrics.hasHorizontalOverflow ? 'PASS' : 'WARN',
  });

  // --- 2. FIVE PORTALS REVIEW ---
  for (const portal of PORTAL_AUDITS) {
    console.log(`\n--- Reviewing ${portal.roleName} (${portal.roleKey}) ---`);

    // Obtain real authenticated session from backend
    const apiRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: portal.email, password: portal.password }),
    });
    const authData = await apiRes.json();
    if (!authData.success || !authData.token) {
      throw new Error(`Authentication failed for ${portal.email}`);
    }

    // Navigate to /login first, then set token into localStorage
    await sendCDP('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
    await sleep(600);
    await evaluate(`
      localStorage.setItem('medicare_token', ${JSON.stringify(authData.token)});
      localStorage.setItem('medicare_user', ${JSON.stringify(JSON.stringify(authData.user))});
    `);

    // Review Primary Dashboard Screen
    const primMetrics = await reviewPage(portal.roleName, 'Dashboard', portal.primaryUrl);
    console.log(`    Dashboard Heading: "${primMetrics.heading.replace(/\n/g, ' ').slice(0, 45)}"`);
    console.log(`    Buttons: ${primMetrics.buttonCount} | Tables: ${primMetrics.tableCount} | Body Length: ${primMetrics.bodyLength} chars`);
    console.log(`    Horizontal Overflow: ${primMetrics.hasHorizontalOverflow} | Broken Images: ${primMetrics.brokenImages}`);

    auditResults.push({
      role: portal.roleName,
      screen: 'Dashboard Screen',
      url: portal.primaryUrl.replace('http://127.0.0.1:5173', ''),
      metrics: primMetrics,
      status: primMetrics.bodyLength > 150 && !primMetrics.hasHorizontalOverflow ? 'PASS' : 'WARN',
    });

    // Review Secondary Feature Screen
    const secMetrics = await reviewPage(portal.roleName, 'Secondary Screen', portal.secondaryUrl);
    console.log(`    Secondary Heading: "${secMetrics.heading.replace(/\n/g, ' ').slice(0, 45)}"`);
    console.log(`    Buttons: ${secMetrics.buttonCount} | Tables: ${secMetrics.tableCount} | Body Length: ${secMetrics.bodyLength} chars`);

    auditResults.push({
      role: portal.roleName,
      screen: 'Secondary Feature',
      url: portal.secondaryUrl.replace('http://127.0.0.1:5173', ''),
      metrics: secMetrics,
      status: secMetrics.bodyLength > 100 && !secMetrics.hasHorizontalOverflow ? 'PASS' : 'WARN',
    });

    // Review Tertiary Feature Screen
    const tertMetrics = await reviewPage(portal.roleName, 'Tertiary Screen', portal.tertiaryUrl);
    console.log(`    Tertiary Heading: "${tertMetrics.heading.replace(/\n/g, ' ').slice(0, 45)}"`);
    console.log(`    Buttons: ${tertMetrics.buttonCount} | Tables: ${tertMetrics.tableCount} | Body Length: ${tertMetrics.bodyLength} chars`);

    auditResults.push({
      role: portal.roleName,
      screen: 'Tertiary Feature',
      url: portal.tertiaryUrl.replace('http://127.0.0.1:5173', ''),
      metrics: tertMetrics,
      status: tertMetrics.bodyLength > 100 && !tertMetrics.hasHorizontalOverflow ? 'PASS' : 'WARN',
    });

    // Test Unauthorized Cross-Role Boundary
    console.log(`    Testing Cross-Role Access Boundary (${portal.forbiddenUrl})...`);
    await sendCDP('Page.navigate', { url: portal.forbiddenUrl });
    await sleep(1500);
    const forbiddenRedirect = await evaluate('window.location.href');
    const isProtected = forbiddenRedirect !== portal.forbiddenUrl || forbiddenRedirect.includes('/login') || forbiddenRedirect.includes('/404');
    console.log(`    Access Defense: Target ${portal.forbiddenUrl} -> Redirected to: ${forbiddenRedirect} (Protected: ${isProtected})`);

    auditResults.push({
      role: portal.roleName,
      screen: 'Cross-Role Guard',
      url: portal.forbiddenUrl.replace('http://127.0.0.1:5173', ''),
      metrics: { redirectedTo: forbiddenRedirect },
      status: isProtected ? 'PASS' : 'FAIL',
    });

    // Clear session for next persona
    await evaluate(`
      localStorage.removeItem('medicare_token');
      localStorage.removeItem('medicare_user');
    `);
    await sleep(400);
  }
}

async function cleanup() {
  console.log('\n[4/4] Cleanly shutting down demonstration services & Chrome...');
  if (ws) {
    try { ws.close(); } catch {}
  }
  if (chromeProc) {
    try { chromeProc.kill('SIGTERM'); } catch {}
  }

  try {
    execSync('python backend/stop_demo.py', { cwd: ROOT_DIR, stdio: 'ignore' });
  } catch (err) {}

  console.log('  [OK] All demo services stopped cleanly.');
}

async function main() {
  try {
    await startServers();
    await initChrome();
    await runReview();
  } finally {
    await cleanup();
  }

  console.log('\n' + '='.repeat(90));
  console.log('                 STEP 14 BROWSER-BASED REVIEW SCORECARD');
  console.log('='.repeat(90));
  console.log(
    'Role / Persona'.padEnd(24) +
    'Screen'.padEnd(22) +
    'Route'.padEnd(25) +
    'Body Chars'.padEnd(12) +
    'Status'
  );
  console.log('-'.repeat(90));

  for (const item of auditResults) {
    const chars = item.metrics.bodyLength ? `${item.metrics.bodyLength}` : (item.metrics.redirectedTo ? 'Redirected' : 'N/A');
    console.log(
      item.role.padEnd(24) +
      item.screen.padEnd(22) +
      item.url.padEnd(25) +
      chars.padEnd(12) +
      `[${item.status}]`
    );
  }

  console.log('-'.repeat(90));
  console.log(`Total Screens & Defenses Reviewed: ${auditResults.length}`);
  console.log(`Console Errors:                   ${consoleErrors.length}`);
  console.log(`Network Errors (>=400):           ${networkErrors.length}`);
  console.log('='.repeat(90));
}

main().catch(err => {
  console.error('[FATAL ERROR IN REVIEW SCRIPT]', err);
  cleanup().finally(() => process.exit(1));
});

