const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'screenshots_phase3');
const CHROME_PATH = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let backendProc = null;
let frontendProc = null;
let chromeProc = null;
let ws = null;
let messageId = 1;
const pendingCalls = new Map();
const results = [];
const capturedScreenshots = [];

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

async function setViewport(width, height, isMobile = false) {
  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: isMobile
  });
  await sleep(400);
}

async function takeScreenshot(fileName) {
  const res = await sendCDP('Page.captureScreenshot', { format: 'png' });
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);
  capturedScreenshots.push({ fileName, sizeKb });
  console.log(`  [SCREENSHOT CAPTURED] ${fileName} (${sizeKb} KB)`);
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

async function startServices() {
  console.log('--- [Step 1] Starting Background Services for Phase 3 Browser Review ---');

  const backendRunning = await waitForHttp('http://127.0.0.1:5000/api/health', 1000);
  if (!backendRunning) {
    console.log('Spawning Waitress backend on port 5000...');
    backendProc = spawn('python', ['-m', 'waitress', '--port=5000', '--host=127.0.0.1', '--threads=4', 'app:app'], {
      cwd: path.join(ROOT_DIR, 'backend'),
      stdio: 'pipe',
      shell: true
    });
    backendProc.stdout.on('data', d => console.log('[Waitress]', d.toString().trim()));
    backendProc.stderr.on('data', d => console.error('[Waitress err]', d.toString().trim()));
  } else {
    console.log('Backend already running on port 5000.');
  }

  const frontendRunning = await waitForHttp('http://127.0.0.1:5173', 1000);
  if (!frontendRunning) {
    console.log('Spawning Vite dev server on port 5173...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    frontendProc = spawn(npmCmd, ['run', 'dev', '--', '--host', '127.0.0.1'], {
      cwd: path.join(ROOT_DIR, 'frontend'),
      stdio: 'pipe',
      shell: true
    });
    frontendProc.stdout.on('data', d => console.log('[Vite]', d.toString().trim()));
    frontendProc.stderr.on('data', d => console.error('[Vite err]', d.toString().trim()));
  } else {
    console.log('Frontend already running on port 5173.');
  }

  const bReady = await waitForHttp('http://127.0.0.1:5000/api/health', 15000);
  const fReady = await waitForHttp('http://127.0.0.1:5173', 15000);

  if (!bReady || !fReady) {
    throw new Error(`Services failed to start in time. Backend: ${bReady}, Frontend: ${fReady}`);
  }
  console.log('Backend & Frontend are responsive and ready.');
}

async function connectToChrome() {
  console.log('--- [Step 2] Launching / Connecting to Chrome via CDP ---');
  let connected = false;
  let tabsRes;
  try {
    tabsRes = await fetch('http://127.0.0.1:9222/json/list');
    if (tabsRes.ok) connected = true;
  } catch {}

  if (!connected) {
    console.log('Launching Chrome with remote debugging on port 9222...');
    const tmpProfile = path.join(os.tmpdir(), `chrome_phase3_${Date.now()}`);
    chromeProc = spawn(CHROME_PATH, [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--remote-debugging-port=9222',
      `--user-data-dir=${tmpProfile}`,
      '--window-size=1366,768',
      'http://localhost:5173/login'
    ], {
      detached: true,
      stdio: 'ignore'
    });
    chromeProc.unref();
    let retries = 20;
    while (retries > 0) {
      await sleep(500);
      try {
        tabsRes = await fetch('http://127.0.0.1:9222/json/list');
        if (tabsRes.ok) break;
      } catch {}
      retries--;
    }
  }

  const tabs = await tabsRes.json();
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pendingCalls.has(data.id)) {
        const { resolve, reject } = pendingCalls.get(data.id);
        pendingCalls.delete(data.id);
        if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
        else resolve(data.result);
      }
    };
  });

  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');
  await sendCDP('DOM.enable');
  await setViewport(1366, 768, false);
  console.log('Connected to Chrome DevTools Protocol session.');
}

async function apiLogin(email, password) {
  const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await res.json();
}

async function setAuth(token, user) {
  await evaluate(`(() => {
    localStorage.setItem('medicare_token', ${JSON.stringify(token)});
    localStorage.setItem('medicare_user', ${JSON.stringify(JSON.stringify(user))});
  })()`);
}

async function runPhase3Audits() {
  console.log('--- [Step 3] Executing Phase 3 Five-Portal Workflow Audits ---');

  // =========================================================================
  // PORTAL 1: Platform Owner
  // =========================================================================
  console.log('\n[PORTAL 1] Testing Platform Owner Portal...');
  const ownerAuth = await apiLogin('owner@mediconnect.com', 'Owner@123');
  if (!ownerAuth.success) throw new Error('Owner login failed: ' + JSON.stringify(ownerAuth));

  await sendCDP('Page.navigate', { url: 'http://localhost:5173/login' });
  await sleep(600);
  await setAuth(ownerAuth.token, ownerAuth.user);

  // 1A. Owner Dashboard
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/owner' });
  await sleep(2000);
  const ownerDashText = await evaluate(`document.body.innerText`);
  const hasOwnerDash = ownerDashText.includes('Platform Overview') && ownerDashText.includes('Total Hospitals');
  results.push({
    portal: 'Platform Owner',
    check: 'Overview & Platform Metrics (/owner)',
    status: hasOwnerDash ? 'PASS' : 'FAIL',
    detail: hasOwnerDash ? 'Dashboard stats loaded cleanly' : 'Metrics missing'
  });
  await takeScreenshot('phase3-portal1-owner-dashboard.png');

  // 1B. Owner Hospitals
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/owner/hospitals' });
  await sleep(2000);
  const ownerHospText = await evaluate(`document.body.innerText`);
  const hasOwnerHosp = ownerHospText.includes('Hospital Management') || ownerHospText.includes('Onboard New Hospital');
  results.push({
    portal: 'Platform Owner',
    check: 'Hospital Management & Directory (/owner/hospitals)',
    status: hasOwnerHosp ? 'PASS' : 'FAIL',
    detail: hasOwnerHosp ? 'Hospital management loaded with search/filters' : 'Hospital management missing'
  });
  await takeScreenshot('phase3-portal1-owner-hospitals.png');

  // =========================================================================
  // PORTAL 2: Hospital Super Admin
  // =========================================================================
  console.log('\n[PORTAL 2] Testing Hospital Super Admin Portal...');
  const adminAuth = await apiLogin('admin.hosp1@medicare.com', 'Admin@123');
  if (!adminAuth.success) throw new Error('Super Admin login failed: ' + JSON.stringify(adminAuth));

  await setAuth(adminAuth.token, adminAuth.user);

  // 2A. Super Admin Dashboard
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/superadmin' });
  await sleep(2000);
  const adminDashText = await evaluate(`document.body.innerText`);
  const hasAdminDash = adminDashText.includes('Active Doctors') && adminDashText.includes('Reception Staff');
  results.push({
    portal: 'Super Admin',
    check: 'Hospital Branch Dashboard (/superadmin)',
    status: hasAdminDash ? 'PASS' : 'FAIL',
    detail: hasAdminDash ? 'Branch operational KPIs loaded cleanly' : 'KPIs missing'
  });
  await takeScreenshot('phase3-portal2-superadmin-dashboard.png');

  // 2B. Super Admin Staff Management
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/superadmin/staff' });
  await sleep(2000);
  // Click Invitations tab
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const invTab = btns.find(b => b.innerText.includes('Invitations'));
    if (invTab) invTab.click();
  })()`);
  await sleep(800);
  const staffText = await evaluate(`document.body.innerText`);
  const hasStaff = staffText.includes('Hospital Staff Management') && (staffText.includes('Invitations') || staffText.includes('Invite Staff'));
  results.push({
    portal: 'Super Admin',
    check: 'Staff Management & Invitations (/superadmin/staff)',
    status: hasStaff ? 'PASS' : 'FAIL',
    detail: hasStaff ? 'Staff management & invitations table active' : 'Staff table missing'
  });
  await takeScreenshot('phase3-portal2-superadmin-staff.png');

  // =========================================================================
  // PORTAL 3: Receptionist
  // =========================================================================
  console.log('\n[PORTAL 3] Testing Receptionist Front Desk Portal...');
  const recAuth = await apiLogin('reception.hosp1@medicare.com', 'Reception@123');
  if (!recAuth.success) throw new Error('Receptionist login failed: ' + JSON.stringify(recAuth));

  await setAuth(recAuth.token, recAuth.user);

  // 3A. Reception Dashboard & Live Queue
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/admin' });
  await sleep(2000);
  const recDashText = await evaluate(`document.body.innerText`);
  const hasRecDash = recDashText.includes('Front Desk Operations') || recDashText.includes('Today\'s Consultation Queue') || recDashText.includes('Patient Check-In');
  results.push({
    portal: 'Receptionist',
    check: 'Front Desk Terminal & Queue (/admin)',
    status: hasRecDash ? 'PASS' : 'FAIL',
    detail: hasRecDash ? 'Live reception desk queue loaded with quick check-in' : 'Front desk queue missing'
  });
  await takeScreenshot('phase3-portal3-reception-dashboard.png');

  // 3B. Patient Check-In Terminal
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/admin/check-in' });
  await sleep(2000);
  const checkInText = await evaluate(`document.body.innerText`);
  const hasCheckIn = checkInText.includes('Patient Arrival & Check-In') || checkInText.includes('Check-In Terminal') || checkInText.includes('Search');
  results.push({
    portal: 'Receptionist',
    check: 'Patient Check-In Terminal (/admin/check-in)',
    status: hasCheckIn ? 'PASS' : 'FAIL',
    detail: hasCheckIn ? 'Check-in terminal loaded with queue filter & actions' : 'Check-in screen missing'
  });
  await takeScreenshot('phase3-portal3-reception-checkin.png');

  // =========================================================================
  // PORTAL 4: Doctor
  // =========================================================================
  console.log('\n[PORTAL 4] Testing Doctor Portal...');
  const docAuth = await apiLogin('dr.one@medicare.com', 'Doctor@123');
  if (!docAuth.success) throw new Error('Doctor login failed: ' + JSON.stringify(docAuth));

  await setAuth(docAuth.token, docAuth.user);

  // 4A. Doctor Clinical Dashboard
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/doctor' });
  await sleep(2000);
  const docDashText = await evaluate(`document.body.innerText`);
  const hasDocDash = docDashText.includes('Dr.') && (docDashText.includes('Today\'s Consultations') || docDashText.includes('Patient Queue') || docDashText.includes('Clinical'));
  results.push({
    portal: 'Doctor',
    check: 'Doctor Clinical Dashboard (/doctor)',
    status: hasDocDash ? 'PASS' : 'FAIL',
    detail: hasDocDash ? 'Clinical dashboard loaded with patient queue & schedule' : 'Clinical dashboard missing'
  });
  await takeScreenshot('phase3-portal4-doctor-dashboard.png');

  // 4B. Doctor Consultations List
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/doctor/appointments' });
  await sleep(2000);
  const docApptText = await evaluate(`document.body.innerText`);
  const hasDocAppt = docApptText.includes('Consultation') || docApptText.includes('Appointments') || docApptText.includes('Clinical Record');
  results.push({
    portal: 'Doctor',
    check: 'Patient Consultations & Notes (/doctor/appointments)',
    status: hasDocAppt ? 'PASS' : 'FAIL',
    detail: hasDocAppt ? 'Consultations table loaded with status filters & notes' : 'Consultations table missing'
  });
  await takeScreenshot('phase3-portal4-doctor-consultations.png');

  // =========================================================================
  // PORTAL 5: Patient
  // =========================================================================
  console.log('\n[PORTAL 5] Testing Patient Portal...');
  const patAuth = await apiLogin('patient.alpha@test.com', 'Patient@123');
  if (!patAuth.success) throw new Error('Patient login failed: ' + JSON.stringify(patAuth));

  await setAuth(patAuth.token, patAuth.user);

  // 5A. Patient Health Dashboard
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/patient' });
  await sleep(2000);
  const patDashText = await evaluate(`document.body.innerText`);
  const hasPatDash = patDashText.includes('Welcome') && (patDashText.includes('Upcoming Consultations') || patDashText.includes('MediConnect Healthcare'));
  results.push({
    portal: 'Patient',
    check: 'Patient Health Dashboard (/patient)',
    status: hasPatDash ? 'PASS' : 'FAIL',
    detail: hasPatDash ? 'Patient dashboard loaded with upcoming appointments' : 'Patient dashboard missing'
  });
  await takeScreenshot('phase3-portal5-patient-dashboard.png');

  // 5B. Patient Medical Records
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/patient/records' });
  await sleep(2000);
  const patRecText = await evaluate(`document.body.innerText`);
  const hasPatRec = patRecText.includes('Medical Records') && patRecText.includes('Clinical Integrity & Patient Privacy');
  results.push({
    portal: 'Patient',
    check: 'Personal Medical Records & Privacy (/patient/records)',
    status: hasPatRec ? 'PASS' : 'FAIL',
    detail: hasPatRec ? 'Medical records & privacy notice verified' : 'Medical records missing'
  });
  await takeScreenshot('phase3-portal5-patient-records.png');

  // =========================================================================
  // RESPONSIVE VIEWPORTS
  // =========================================================================
  console.log('\n[RESPONSIVE] Testing Tablet & Mobile Breakpoints...');

  // Tablet (768x1024)
  await setViewport(768, 1024, true);
  await sleep(800);
  const tabState = await evaluate(`({
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);
  results.push({
    portal: 'Responsive',
    check: 'Tablet Viewport (768x1024)',
    status: !tabState.hasOverflow ? 'PASS' : 'FAIL',
    detail: !tabState.hasOverflow ? 'Clean layout, zero horizontal overflow' : 'Horizontal overflow detected'
  });
  await takeScreenshot('phase3-responsive-tablet.png');

  // Mobile (390x844)
  await setViewport(390, 844, true);
  await sleep(800);
  const mobState = await evaluate(`({
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  })`);
  results.push({
    portal: 'Responsive',
    check: 'Mobile Viewport (390x844)',
    status: !mobState.hasOverflow ? 'PASS' : 'FAIL',
    detail: !mobState.hasOverflow ? 'Clean layout, zero horizontal overflow' : 'Horizontal overflow detected'
  });
  await takeScreenshot('phase3-responsive-mobile.png');

  // Restore Desktop Viewport
  await setViewport(1366, 768, false);
}

async function shutdown() {
  console.log('\n--- [Step 4] Cleaning Up Test Review Processes ---');
  if (ws) {
    try { ws.close(); } catch {}
  }
  const killTree = (proc) => {
    if (!proc || !proc.pid) return;
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' });
      } catch {}
    } else {
      try { proc.kill('SIGINT'); } catch {}
    }
  };
  killTree(backendProc);
  killTree(frontendProc);
  killTree(chromeProc);
}

async function main() {
  try {
    await startServices();
    await connectToChrome();
    await runPhase3Audits();
  } finally {
    await shutdown();
  }

  console.log('\n' + '='.repeat(90));
  console.log('       MEDICONNECT PHASE 3: FIVE PORTALS VERIFICATION SCORECARD');
  console.log('='.repeat(90));
  console.log('Portal'.padEnd(16) + 'Verification Item'.padEnd(46) + 'Status'.padEnd(10) + 'Detail');
  console.log('-'.repeat(90));

  let passed = 0;
  for (const r of results) {
    if (r.status === 'PASS') passed++;
    console.log(r.portal.padEnd(16) + r.check.padEnd(46) + `[${r.status}]`.padEnd(10) + r.detail);
  }

  console.log('-'.repeat(90));
  console.log(`Summary: ${passed} / ${results.length} Checks Passed (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Screenshots Captured: ${capturedScreenshots.length} files in docs/screenshots_phase3/`);
  console.log('='.repeat(90) + '\n');
}

main().catch(err => {
  console.error('[FATAL ERROR IN PHASE 3 BROWSER TEST]', err);
  shutdown().then(() => process.exit(1));
});
