const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'docs', 'screenshots_phase1');
const CHROME_PATH = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PORTALS = [
  {
    roleId: 'PATIENT',
    tabText: 'Patient / User',
    expectedHeading: 'Patient Portal Sign In',
    expectedButton: 'Sign In to Patient Portal',
    hasPublicReg: true,
    screenshotName: 'phase1-login-patient.png'
  },
  {
    roleId: 'DOCTOR',
    tabText: 'Doctor',
    expectedHeading: 'Doctor Clinical Sign In',
    expectedButton: 'Sign In as Doctor',
    hasPublicReg: false,
    screenshotName: 'phase1-login-doctor.png'
  },
  {
    roleId: 'RECEPTIONIST',
    tabText: 'Reception / Admin',
    expectedHeading: 'Hospital Front Desk Sign In',
    expectedButton: 'Sign In to Reception Terminal',
    hasPublicReg: false,
    screenshotName: 'phase1-login-receptionist.png'
  },
  {
    roleId: 'HOSPITAL_SUPER_ADMIN',
    tabText: 'Super Admin',
    expectedHeading: 'Hospital Administration Console',
    expectedButton: 'Sign In as Hospital Super Admin',
    hasPublicReg: false,
    screenshotName: 'phase1-login-superadmin.png'
  },
  {
    roleId: 'PLATFORM_OWNER',
    tabText: 'Platform Owner',
    expectedHeading: 'Platform Governance Console',
    expectedButton: 'Sign In to Platform Governance',
    hasPublicReg: false,
    screenshotName: 'phase1-login-owner.png'
  }
];

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
  capturedScreenshots.push({
    fileName,
    sizeKb: (fs.statSync(filePath).size / 1024).toFixed(1)
  });
}

async function connectToChrome() {
  console.log('Connecting to Google Chrome CDP session...');
  let connected = false;
  let tabsRes;
  try {
    tabsRes = await fetch('http://127.0.0.1:9222/json/list');
    if (tabsRes.ok) connected = true;
  } catch {}

  if (!connected) {
    console.log('Launching visible Chrome with remote debugging on port 9222...');
    const tmpProfile = path.join(os.tmpdir(), `chrome_phase1_${Date.now()}`);
    spawn(CHROME_PATH, [
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
    }).unref();
    await sleep(2500);
    tabsRes = await fetch('http://127.0.0.1:9222/json/list');
  }

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
      }
    } catch {}
  };

  await new Promise(r => ws.onopen = r);
  await sendCDP('Page.enable');
  await sendCDP('Runtime.enable');
  console.log('Connected to Chrome CDP session.\n');
}

async function runPhase1Audits() {
  await setViewport(1366, 768, false);

  // Navigate to login
  await sendCDP('Page.navigate', { url: 'http://localhost:5173/login' });
  await sleep(1500);

  // -------------------------------------------------------------------------
  // 1. AUDIT ALL 5 PORTAL SELECTIONS & DYNAMIC UPDATES
  // -------------------------------------------------------------------------
  console.log('======================================================================');
  console.log(' 1. TESTING DYNAMIC LOGIN EXPERIENCE ACROSS ALL 5 PORTALS');
  console.log('======================================================================');

  for (const portal of PORTALS) {
    console.log(`\nTesting Portal Tab: "${portal.tabText}"...`);

    // Click tab button
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tab = buttons.find(b => b.innerText.includes(${JSON.stringify(portal.tabText)}));
        if (tab) tab.click();
      })()
    `);
    await sleep(500);

    // Read dynamic page state
    const pageState = await evaluate(`({
      heading: document.querySelector('h1')?.innerText?.trim() || '',
      submitBtnText: document.querySelector('button[type="submit"]')?.innerText?.trim() || '',
      hasRegisterLink: Boolean(document.querySelector('a[href="/register"]')),
      emailLabel: document.querySelector('.form-group label')?.innerText?.trim() || '',
      infoBadgeText: document.querySelector('.card [style*="border-left"]')?.innerText || '',
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    })`);

    const headingOk = pageState.heading === portal.expectedHeading;
    const buttonOk = pageState.submitBtnText === portal.expectedButton;
    const regLinkOk = pageState.hasRegisterLink === portal.hasPublicReg;

    console.log(`  Dynamic Heading:     "${pageState.heading}" (Match: ${headingOk})`);
    console.log(`  Dynamic Button:      "${pageState.submitBtnText}" (Match: ${buttonOk})`);
    console.log(`  Email Field Label:   "${pageState.emailLabel}"`);
    console.log(`  Public Register Link: ${pageState.hasRegisterLink} (Expected: ${portal.hasPublicReg})`);

    await takeScreenshot(portal.screenshotName);

    const pass = headingOk && buttonOk && regLinkOk && !pageState.hasHorizontalOverflow;
    results.push({
      test: `Dynamic UI: ${portal.tabText}`,
      expected: portal.expectedHeading,
      actual: pageState.heading,
      status: pass ? 'PASS' : 'FAIL'
    });
  }

  // -------------------------------------------------------------------------
  // 2. AUDIT REGISTRATION NAVIGATION & LINKAGE
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(' 2. TESTING PATIENT REGISTRATION NAVIGATION & BIDIRECTIONAL LINKAGE');
  console.log('======================================================================');

  // Switch to Patient tab
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const pTab = buttons.find(b => b.innerText.includes('Patient / User'));
      if (pTab) pTab.click();
    })()
  `);
  await sleep(400);

  // Click "Register as a Patient"
  console.log('Clicking "Register as a Patient" link on login page...');
  await evaluate(`
    (() => {
      const link = document.querySelector('a[href="/register"]');
      if (link) link.click();
    })()
  `);
  await sleep(1200);

  const regPageState = await evaluate(`({
    path: window.location.pathname,
    heading: document.querySelector('h2')?.innerText?.trim() || '',
    inputCount: document.querySelectorAll('input').length,
    hasLoginLink: Boolean(document.querySelector('a[href="/login"]')),
    loginLinkText: document.querySelector('a[href="/login"]')?.innerText || ''
  })`);

  console.log(`  Navigated to:       ${regPageState.path} (Expected: /register)`);
  console.log(`  Registration Header: "${regPageState.heading}"`);
  console.log(`  Input Fields Count:  ${regPageState.inputCount} (Name, Email, Phone, Passwords)`);
  console.log(`  Has "Login" Link:    ${regPageState.hasLoginLink} ("${regPageState.loginLinkText}")`);

  await takeScreenshot('phase1-patient-register.png');

  const regNavPass = regPageState.path === '/register' && regPageState.heading.includes('Create Patient Account') && regPageState.hasLoginLink;
  results.push({
    test: 'Navigation: Login -> Register',
    expected: '/register (Create Patient Account)',
    actual: `${regPageState.path} (${regPageState.heading})`,
    status: regNavPass ? 'PASS' : 'FAIL'
  });

  // Click "Login as Patient" link on register page
  console.log('Clicking "Login as Patient" link on register page...');
  await evaluate(`
    (() => {
      const link = document.querySelector('a[href="/login"]');
      if (link) link.click();
    })()
  `);
  await sleep(1200);

  const returnState = await evaluate(`({
    path: window.location.pathname,
    heading: document.querySelector('h1')?.innerText?.trim() || '',
    activeTabRole: document.querySelector('.card button[style*="border: 1.5px solid"]')?.innerText || ''
  })`);

  console.log(`  Navigated to:       ${returnState.path} (Expected: /login)`);
  console.log(`  Returned Heading:   "${returnState.heading}"`);
  console.log(`  Active Tab:         "${returnState.activeTabRole.replace(/\\s+/g, ' ')}"`);

  const returnPass = returnState.path === '/login' && returnState.heading === 'Patient Portal Sign In';
  results.push({
    test: 'Navigation: Register -> Patient Login',
    expected: 'Patient Portal Sign In',
    actual: returnState.heading,
    status: returnPass ? 'PASS' : 'FAIL'
  });

  // -------------------------------------------------------------------------
  // 3. AUDIT DEFENSIVE ROLE MISMATCH REJECTION
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(' 3. TESTING DEFENSIVE ROLE MISMATCH REJECTION');
  console.log('======================================================================');

  // Select "Super Admin" tab
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saTab = buttons.find(b => b.innerText.includes('Super Admin'));
      if (saTab) saTab.click();
    })()
  `);
  await sleep(400);

  // Fill in Patient credentials while on Super Admin tab
  console.log('Entering Patient credentials under Hospital Super Admin portal...');
  await evaluate(`
    (() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      if (emailInput && passInput) {
        setVal.call(emailInput, 'patient.alpha@test.com');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        setVal.call(passInput, 'Patient@123');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await sleep(400);

  // Click Submit
  await evaluate(`
    (() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()
  `);
  await sleep(1500);

  const mismatchState = await evaluate(`({
    url: window.location.pathname,
    hasErrorBanner: Boolean(document.querySelector('.login-error-banner')),
    errorText: document.querySelector('.login-error-banner p')?.innerText || '',
    hasSwitchButton: Boolean(document.querySelector('.role-switch-btn')),
    switchButtonText: document.querySelector('.role-switch-btn')?.innerText || '',
    tokenInStorage: Boolean(localStorage.getItem('medicare_token'))
  })`);

  console.log(`  Navigation Blocked:  ${mismatchState.url === '/login'}`);
  console.log(`  Error Message:       "${mismatchState.errorText}"`);
  console.log(`  Has Switch Button:   ${mismatchState.hasSwitchButton} ("${mismatchState.switchButtonText}")`);
  console.log(`  Token Denied (Null): ${!mismatchState.tokenInStorage}`);

  await takeScreenshot('phase1-role-mismatch.png');

  const mismatchPass = mismatchState.hasErrorBanner && mismatchState.hasSwitchButton && !mismatchState.tokenInStorage;
  results.push({
    test: 'Security: Cross-Role Tab Mismatch Rejection',
    expected: 'Account role mismatch error with switch button',
    actual: mismatchState.errorText.slice(0, 45) + '...',
    status: mismatchPass ? 'PASS' : 'FAIL'
  });

  // Click Switch Button to resolve mismatch
  console.log('Clicking Switch Button in error banner...');
  await evaluate(`
    (() => {
      const switchBtn = document.querySelector('.role-switch-btn');
      if (switchBtn) switchBtn.click();
    })()
  `);
  await sleep(500);

  const resolvedState = await evaluate(`({
    heading: document.querySelector('h1')?.innerText?.trim() || '',
    errorPresent: Boolean(document.querySelector('.login-error-banner'))
  })`);

  console.log(`  Switched to Heading: "${resolvedState.heading}"`);
  console.log(`  Error Banner Cleared: ${!resolvedState.errorPresent}`);

  // -------------------------------------------------------------------------
  // 4. RESPONSIVE VIEWPORT CHECKS
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(' 4. TESTING RESPONSIVE VIEWPORTS (DESKTOP, TABLET, MOBILE)');
  console.log('======================================================================');

  // Mobile Viewport (390x844)
  await setViewport(390, 844, true);
  await sleep(600);

  const mobState = await evaluate(`({
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    cardWidth: document.querySelector('.card')?.clientWidth || 0
  })`);

  console.log(`  Mobile 390x844: Card Width: ${mobState.cardWidth}px | Horizontal Overflow: ${mobState.hasOverflow}`);
  await takeScreenshot('phase1-login-mobile.png');

  results.push({
    test: 'Responsive: Mobile (390x844)',
    expected: 'Zero Horizontal Overflow',
    actual: `Overflow: ${mobState.hasOverflow}`,
    status: !mobState.hasOverflow ? 'PASS' : 'WARN'
  });

  // Tablet Viewport (768x1024)
  await setViewport(768, 1024, true);
  await sleep(600);

  const tabState = await evaluate(`({
    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);

  console.log(`  Tablet 768x1024: Horizontal Overflow: ${tabState.hasOverflow}`);

  results.push({
    test: 'Responsive: Tablet (768x1024)',
    expected: 'Zero Horizontal Overflow',
    actual: `Overflow: ${tabState.hasOverflow}`,
    status: !tabState.hasOverflow ? 'PASS' : 'WARN'
  });

  // Restore Desktop Viewport
  await setViewport(1366, 768, false);
}

async function main() {
  await connectToChrome();
  try {
    await runPhase1Audits();
  } finally {
    if (ws) ws.close();
  }

  console.log('\n' + '='.repeat(85));
  console.log('           PHASE 1: DYNAMIC LOGIN & REGISTRATION VERIFICATION SCORECARD');
  console.log('='.repeat(85));
  console.log(
    'Audit Test Name'.padEnd(42) +
    'Status'.padEnd(10) +
    'Actual Outcome'
  );
  console.log('-'.repeat(85));

  let passed = 0;
  for (const r of results) {
    if (r.status === 'PASS') passed++;
    console.log(
      r.test.padEnd(42) +
      `[${r.status}]`.padEnd(10) +
      r.actual
    );
  }

  console.log('-'.repeat(85));
  console.log(`Total Verification Checks: ${results.length} | Passed: ${passed} / ${results.length}`);
  console.log(`Screenshots Captured:      ${capturedScreenshots.length} files in docs/screenshots_phase1/`);
  console.log('='.repeat(85));
}

main().catch(err => {
  console.error('[FATAL ERROR IN PHASE 1 TEST SCRIPT]', err);
  process.exit(1);
});

