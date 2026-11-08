const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const CHROME_PATH = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

const ROLES_TO_TEST = [
  {
    roleName: 'Platform Owner',
    buttonSelector: 'button:has-text("Demo Owner"), button:has-text("Owner")',
    buttonText: 'Demo Owner',
    expectedEmail: 'owner@mediconnect.com',
    expectedUrl: '/owner',
    expectedHeading: 'Platform Overview'
  },
  {
    roleName: 'Hospital Super Admin',
    buttonText: 'Demo Super Admin',
    expectedEmail: 'admin.hosp1@medicare.com',
    expectedUrl: '/superadmin',
    expectedHeading: 'Reliability General Hospital'
  },
  {
    roleName: 'Receptionist',
    buttonText: 'Demo Receptionist',
    expectedEmail: 'reception.hosp1@medicare.com',
    expectedUrl: '/admin',
    expectedHeading: 'Hospital Front Desk & Reception'
  },
  {
    roleName: 'Doctor',
    buttonText: 'Demo Doctor',
    expectedEmail: 'dr.one@medicare.com',
    expectedUrl: '/doctor',
    expectedHeading: 'Welcome, Dr. Hospital One'
  },
  {
    roleName: 'Patient',
    buttonText: 'Demo Patient',
    expectedEmail: 'patient.alpha@test.com',
    expectedUrl: '/patient',
    expectedHeading: 'Welcome, Verified Patient Alpha!'
  },
  {
    roleName: 'Legacy Admin',
    buttonText: 'Legacy Admin',
    expectedEmail: 'legacy.admin@medicare.com',
    expectedUrl: '/admin',
    expectedHeading: 'Administration'
  }
];

let ws = null;
let messageId = 1;
const pendingCalls = new Map();
const results = [];

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

async function connectToChrome() {
  console.log('Connecting to Chrome CDP on port 9222...');
  let connected = false;
  let tabsRes;
  try {
    tabsRes = await fetch('http://127.0.0.1:9222/json/list');
    if (tabsRes.ok) connected = true;
  } catch {}

  if (!connected) {
    console.log('Starting visible Chrome instance on port 9222...');
    const tmpProfile = path.join(os.tmpdir(), `chrome_demo_audit_${Date.now()}`);
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

async function runTest() {
  for (const role of ROLES_TO_TEST) {
    console.log(`----------------------------------------------------------------------`);
    console.log(`TESTING DEMO PERSONA: ${role.roleName.toUpperCase()}`);
    console.log(`----------------------------------------------------------------------`);

    // 1. Navigate to Login Page
    await sendCDP('Page.navigate', { url: 'http://localhost:5173/login' });
    await sleep(1200);

    // 2. Click the specific 1-Click Demo Account button
    const buttonClicked = await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const targetBtn = buttons.find(b => b.innerText.includes(${JSON.stringify(role.buttonText)}));
        if (targetBtn) {
          targetBtn.click();
          return true;
        }
        return false;
      })()
    `);

    if (!buttonClicked) {
      console.log(`[FAIL] Could not find button for ${role.buttonText}`);
      results.push({ role: role.roleName, status: 'FAIL', reason: 'Demo button not found' });
      continue;
    }

    await sleep(400);

    // 3. Inspect Form Values autofilled
    const formValues = await evaluate(`({
      email: document.querySelector('input[type="email"]')?.value,
      passwordLength: document.querySelector('input[type="password"]')?.value?.length || 0,
      roleTabSelected: document.querySelector('.card')?.innerText
    })`);

    const emailCorrect = (formValues.email === role.expectedEmail);
    console.log(`  Autofilled Email: ${formValues.email} (Matches Expected: ${emailCorrect})`);
    console.log(`  Password populated: ${formValues.passwordLength > 0}`);

    // 4. Click Submit Button
    const submitted = await evaluate(`
      (() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
        return false;
      })()
    `);

    // 5. Wait for navigation / response
    await sleep(2000);

    const postLoginState = await evaluate(`({
      url: window.location.pathname,
      fullUrl: window.location.href,
      heading: document.querySelector('h1, h2, h3')?.innerText?.replace(/\\s+/g, ' ') || '',
      tokenPresent: Boolean(localStorage.getItem('medicare_token')),
      userRole: (() => {
        try {
          return JSON.parse(localStorage.getItem('medicare_user') || '{}')?.role;
        } catch { return null; }
      })(),
      errorMessage: document.querySelector('.emergency, [style*="emergency"]')?.innerText || ''
    })`);

    console.log(`  Target Path: ${postLoginState.url} (Expected: ${role.expectedUrl})`);
    console.log(`  Header / Greeting: "${postLoginState.heading.slice(0, 45)}"`);
    console.log(`  JWT Token Stored: ${postLoginState.tokenPresent}`);
    console.log(`  Verified User Role: ${postLoginState.userRole}`);
    if (postLoginState.errorMessage) {
      console.log(`  Error on Page: ${postLoginState.errorMessage}`);
    }

    const loginSuccess = postLoginState.url.startsWith(role.expectedUrl) && postLoginState.tokenPresent;

    // 6. Test Logout
    console.log(`  Executing Logout...`);
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const lBtn = btns.find(b => b.innerText.toLowerCase().includes('logout') || b.getAttribute('aria-label') === 'Logout');
        if (lBtn) lBtn.click();
      })()
    `);
    await sleep(800);

    // Clean up storage unconditionally
    await evaluate(`
      localStorage.removeItem('medicare_token');
      localStorage.removeItem('medicare_user');
    `);

    const resultStatus = loginSuccess ? 'PASS' : 'FAIL';
    console.log(`  Result for ${role.roleName}: [${resultStatus}]\n`);
    results.push({
      role: role.roleName,
      email: role.expectedEmail,
      dashboard: postLoginState.url,
      heading: postLoginState.heading.slice(0, 35),
      status: resultStatus
    });
  }
}

async function main() {
  await connectToChrome();
  await runTest();
  
  // Return browser to login screen
  try {
    await sendCDP('Page.navigate', { url: 'http://localhost:5173/login' });
  } catch {}

  console.log('\n' + '='.repeat(80));
  console.log('             DEMO ACCOUNT LOGIN VERIFICATION SCORECARD');
  console.log('='.repeat(80));
  console.log('Role Name'.padEnd(25) + 'Autofill Email'.padEnd(30) + 'Destination'.padEnd(16) + 'Status');
  console.log('-'.repeat(80));

  let passed = 0;
  for (const r of results) {
    if (r.status === 'PASS') passed++;
    console.log(
      r.role.padEnd(25) +
      r.email.padEnd(30) +
      r.dashboard.padEnd(16) +
      `[${r.status}]`
    );
  }

  console.log('-'.repeat(80));
  console.log(`Total Tested: ${results.length} | Passed: ${passed} / ${results.length}`);
  console.log('='.repeat(80));

  if (ws) ws.close();
}

main().catch(err => {
  console.error('[FATAL ERROR IN DEMO LOGIN VERIFICATION]', err);
  process.exit(1);
});

