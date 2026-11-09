const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'screenshots_phase2');
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
  console.log('--- [Step 1] Starting Background Services for Browser Review ---');

  // Check if port 5000 is open
  const backendRunning = await waitForHttp('http://127.0.0.1:5000/api/health', 1000);
  if (!backendRunning) {
    console.log('Spawning Waitress backend on port 5000...');
    backendProc = spawn('python', ['-m', 'waitress', '--port=5000', '--host=127.0.0.1', '--threads=4', 'app:app'], {
      cwd: path.join(ROOT_DIR, 'backend'),
      stdio: 'pipe',
      shell: true
    });
  } else {
    console.log('Backend already running on port 5000.');
  }

  // Check if port 5173 is open
  const frontendRunning = await waitForHttp('http://127.0.0.1:5173', 1000);
  if (!frontendRunning) {
    console.log('Spawning Vite dev server on port 5173...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    frontendProc = spawn(npmCmd, ['run', 'dev', '--', '--host', '127.0.0.1'], {
      cwd: path.join(ROOT_DIR, 'frontend'),
      stdio: 'pipe',
      shell: true
    });
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
    const tmpProfile = path.join(os.tmpdir(), `chrome_phase2_${Date.now()}`);
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
    await sleep(2500);
    tabsRes = await fetch('http://127.0.0.1:9222/json/list');
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

async function runPhase2BrowserAudits() {
  console.log('--- [Step 3] Executing Phase 2 Visual Workflow Audits ---');

  // -------------------------------------------------------------------------
  // AUDIT 1: Platform Owner Invitations Screen
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 1] Navigating to Platform Owner Invitations Screen...');
  const ownerAuth = await apiLogin('owner@mediconnect.com', 'Owner@123');
  if (!ownerAuth.success || !ownerAuth.token) {
    throw new Error('Platform Owner login failed via backend API.');
  }

  await sendCDP('Page.navigate', { url: 'http://localhost:5173/login' });
  await sleep(1000);

  // Set auth credentials into localStorage
  await evaluate(`(() => {
    localStorage.setItem('medicare_token', ${JSON.stringify(ownerAuth.token)});
    localStorage.setItem('medicare_user', ${JSON.stringify(JSON.stringify(ownerAuth.user))});
  })()`);

  await sendCDP('Page.navigate', { url: 'http://localhost:5173/owner/invitations' });
  await sleep(2000);

  const ownerPageText = await evaluate(`document.body.innerText`);
  const hasOwnerHeader = ownerPageText.includes('Super Admin Invitations') || ownerPageText.includes('Issue Super Admin Invite');
  results.push({
    test: 'Platform Owner Invitations Screen (/owner/invitations)',
    expected: 'Page loads with invitation management table & actions',
    actual: hasOwnerHeader ? 'Invitations console loaded' : 'Console text missing',
    status: hasOwnerHeader ? 'PASS' : 'FAIL'
  });
  await takeScreenshot('phase2-owner-invitations.png');

  // -------------------------------------------------------------------------
  // AUDIT 2: Hospital Super Admin Staff Management & Invitations Screen
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 2] Navigating to Hospital Super Admin Staff Management Screen...');
  const adminAuth = await apiLogin('admin.hosp1@medicare.com', 'Admin@123');
  if (!adminAuth.success || !adminAuth.token) {
    throw new Error('Hospital Super Admin login failed via backend API.');
  }

  await evaluate(`(() => {
    localStorage.setItem('medicare_token', ${JSON.stringify(adminAuth.token)});
    localStorage.setItem('medicare_user', ${JSON.stringify(JSON.stringify(adminAuth.user))});
  })()`);

  await sendCDP('Page.navigate', { url: 'http://localhost:5173/superadmin/staff' });
  await sleep(2000);

  // Switch to Invitations Tab
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const invTab = btns.find(b => b.innerText.includes('Invitations'));
    if (invTab) invTab.click();
  })()`);
  await sleep(1000);

  const staffPageText = await evaluate(`document.body.innerText`);
  const hasStaffHeader = staffPageText.includes('Hospital Staff Management') && staffPageText.includes('Invitations');
  results.push({
    test: 'Hospital Super Admin Staff Screen (/superadmin/staff)',
    expected: 'Staff roster & cryptographic invitations management active',
    actual: hasStaffHeader ? 'Staff console and tabs loaded' : 'Staff console text missing',
    status: hasStaffHeader ? 'PASS' : 'FAIL'
  });
  await takeScreenshot('phase2-superadmin-staff.png');

  // -------------------------------------------------------------------------
  // AUDIT 3: Staff Invitation Acceptance Screen
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 3] Generating Live Invitation & Opening Acceptance Portal...');
  const uniqueSuffix = Date.now().toString().slice(-4);
  const targetEmail = `audit.staff.${uniqueSuffix}@medicare.com`;

  // Super Admin issues an invitation for a Receptionist
  const inviteRes = await fetch('http://127.0.0.1:5000/api/hospital/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({
      email: targetEmail,
      role: 'RECEPTIONIST'
    })
  });
  const inviteData = await inviteRes.json();
  if (!inviteData.success || !inviteData.invitation?.token) {
    throw new Error('Failed to generate live invitation token: ' + JSON.stringify(inviteData));
  }
  const rawToken = inviteData.invitation.token;

  // Clear localStorage so user is unauthenticated
  await evaluate(`(() => {
    localStorage.removeItem('medicare_token');
    localStorage.removeItem('medicare_user');
  })()`);

  // Navigate to acceptance URL
  await sendCDP('Page.navigate', { url: `http://localhost:5173/invite/accept/${rawToken}` });
  await sleep(2500);

  const acceptPageText = await evaluate(`document.body.innerText`);
  const hasAcceptForm = acceptPageText.includes('Activate Staff Account') || acceptPageText.includes('Full Name');
  results.push({
    test: 'Staff Invitation Acceptance Portal (/invite/accept/:token)',
    expected: 'Displays role, hospital name, and account activation form',
    actual: hasAcceptForm ? 'Acceptance form verified' : 'Form text missing',
    status: hasAcceptForm ? 'PASS' : 'FAIL'
  });
  await takeScreenshot('phase2-accept-invitation.png');

  // -------------------------------------------------------------------------
  // AUDIT 4: Form Submission & Account Activation
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 4] Filling and Submitting Staff Activation Form...');
  await evaluate(`(() => {
    function setReactInput(input, value) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const inputs = document.querySelectorAll('input');
    // Name is text input
    const nameInput = Array.from(inputs).find(i => i.type === 'text' && (i.placeholder.includes('Name') || i.required));
    if (nameInput) setReactInput(nameInput, 'Verified Audit Receptionist');

    // Phone input
    const phoneInput = Array.from(inputs).find(i => i.type === 'tel' || i.placeholder.includes('Phone') || i.placeholder.includes('91'));
    if (phoneInput) setReactInput(phoneInput, '+91 98765 43210');

    // Password inputs
    const pwdInputs = Array.from(inputs).filter(i => i.type === 'password');
    if (pwdInputs.length >= 2) {
      setReactInput(pwdInputs[0], 'StaffPassword123!');
      setReactInput(pwdInputs[1], 'StaffPassword123!');
    }
  })()`);
  await sleep(600);

  // Click Submit Button
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.type === 'submit' || b.innerText.includes('Activate') || b.innerText.includes('Create'));
    if (submitBtn) submitBtn.click();
  })()`);
  await sleep(3000);

  const successPageText = await evaluate(`document.body.innerText`);
  const isActivated = successPageText.includes('Account Successfully Activated') || successPageText.includes('Proceed to Login');
  results.push({
    test: 'Staff Account Activation Execution',
    expected: 'Success card renders with role confirmation & proceed button',
    actual: isActivated ? 'Account successfully activated' : 'Success message missing',
    status: isActivated ? 'PASS' : 'FAIL'
  });
  await takeScreenshot('phase2-activation-success.png');

  // -------------------------------------------------------------------------
  // AUDIT 5: Proceed to Login Navigation & Pre-Selected Role
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 5] Clicking Proceed to Login & Verifying Dynamic Role Pre-Selection...');
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const proceedBtn = btns.find(b => b.innerText.includes('Proceed to Login'));
    if (proceedBtn) proceedBtn.click();
  })()`);
  await sleep(1500);

  const loginState = await evaluate(`(() => {
    const activeTab = document.querySelector('.login-role-tab.active') || document.querySelector('[role="tab"][aria-selected="true"]');
    const heading = document.querySelector('h1')?.innerText || document.querySelector('h2')?.innerText;
    return {
      activeRole: activeTab?.innerText || '',
      heading: heading || '',
      url: window.location.href
    };
  })()`);

  const rolePreselected = loginState.activeRole.includes('Reception') || loginState.heading.includes('Front Desk') || loginState.heading.includes('Reception');
  results.push({
    test: 'Post-Activation Dynamic Login Role Synchronization',
    expected: 'Redirects to /login and pre-selects Receptionist portal tab',
    actual: rolePreselected ? `Role tab & heading pre-selected: "${loginState.heading}"` : `Unexpected heading: "${loginState.heading}"`,
    status: rolePreselected ? 'PASS' : 'FAIL'
  });
  await takeScreenshot('phase2-activated-login.png');

  // -------------------------------------------------------------------------
  // AUDIT 6: Expired / Invalid Invitation Error Card
  // -------------------------------------------------------------------------
  console.log('\n[AUDIT 6] Testing Invalid / Malformed Token Handling...');
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/invite/accept/invalid_test_token_malformed_999' });
  await sleep(2000);

  const invalidPageText = await evaluate(`document.body.innerText`);
  const showsInvalidError = invalidPageText.includes('Invalid Invitation') || invalidPageText.includes('Unable to verify') || invalidPageText.includes('Invalid');
  results.push({
    test: 'Invalid / Revoked Invitation Error Guard',
    expected: 'Displays clean error card preventing unauthorized account creation',
    actual: showsInvalidError ? 'Error banner properly displayed' : 'Error guard missing',
    status: showsInvalidError ? 'PASS' : 'FAIL'
  });
  await takeScreenshot('phase2-invalid-invitation.png');
}

async function shutdown() {
  console.log('\n--- [Step 4] Shutting Down Temporary Review Processes ---');
  if (ws) {
    try { ws.close(); } catch {}
  }
  if (backendProc) {
    try { backendProc.kill('SIGINT'); } catch {}
  }
  if (frontendProc) {
    try { frontendProc.kill('SIGINT'); } catch {}
  }
  if (chromeProc) {
    try { chromeProc.kill('SIGINT'); } catch {}
  }
}

async function main() {
  try {
    await startServices();
    await connectToChrome();
    await runPhase2BrowserAudits();
  } finally {
    await shutdown();
  }

  console.log('\n' + '='.repeat(85));
  console.log('       MEDICONNECT PHASE 2: BROWSER AUTOMATION VERIFICATION SCORECARD');
  console.log('='.repeat(85));
  console.log('Verification Test'.padEnd(52) + 'Status'.padEnd(10) + 'Outcome');
  console.log('-'.repeat(85));

  let passed = 0;
  for (const r of results) {
    if (r.status === 'PASS') passed++;
    console.log(r.test.padEnd(52) + `[${r.status}]`.padEnd(10) + r.actual);
  }

  console.log('-'.repeat(85));
  console.log(`Summary: ${passed} / ${results.length} Checks Passed (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Captured: ${capturedScreenshots.length} screenshots in docs/screenshots_phase2/`);
  console.log('='.repeat(85) + '\n');
}

main().catch(err => {
  console.error('[FATAL ERROR IN PHASE 2 BROWSER TEST]', err);
  shutdown().then(() => process.exit(1));
});
