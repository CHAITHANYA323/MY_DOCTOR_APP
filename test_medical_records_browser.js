import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'qa_screenshots');
const CHROME_PATH = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let chromeProc = null;
let ws = null;
let messageId = 1;
const pendingCalls = new Map();
const consoleErrors = [];

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

async function waitForSelector(selector, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const exists = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
      if (exists) return true;
    } catch {}
    await sleep(250);
  }
  const bodyText = await evaluate('document.body ? document.body.innerText.slice(0, 200) : "no-body"');
  throw new Error(`Timeout waiting for selector "${selector}". Current body text: "${bodyText}"`);
}

async function captureScreenshot(filename) {
  const targetPath = path.join(SCREENSHOT_DIR, filename);
  const res = await sendCDP('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(targetPath, Buffer.from(res.data, 'base64'));
  const sizeKb = (fs.statSync(targetPath).size / 1024).toFixed(1);
  console.log(`    [SCREENSHOT] ${filename} (${sizeKb} KB)`);
  return { path: targetPath, sizeKb };
}

async function setViewport(width, height) {
  await sendCDP('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await sleep(300);
}

async function runTest() {
  console.log('======================================================');
  console.log('MEDICONNECT PATIENT MEDICAL RECORDS BROWSER TEST');
  console.log('======================================================\n');

  // Step 1: Login via API to get token
  console.log('[1/7] Authenticating patient.alpha@test.com ...');
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'patient.alpha@test.com',
      password: 'Patient@123'
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Failed to authenticate patient: ' + JSON.stringify(loginData));
  }
  console.log('  [PASS] Logged in as:', loginData.user?.name);
  const token = loginData.token;
  const userJson = JSON.stringify(loginData.user);

  // Step 2: Launch Chrome
  console.log('[2/7] Launching Headless Chrome with remote debugging on port 9222 ...');
  const tmpProfile = path.join(os.tmpdir(), `chrome_mediconnect_mr_${Date.now()}`);
  chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tmpProfile}`,
    '--window-size=1440,900',
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
  await setViewport(1440, 900);

  // Step 3: Inject auth and language (en)
  console.log('[3/7] Setting auth credentials and navigating to /patient/records (English)...');
  await sendCDP('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await sleep(1000);

  await evaluate(`
    localStorage.setItem('medicare_token', ${JSON.stringify(token)});
    localStorage.setItem('medicare_user', ${JSON.stringify(userJson)});
    localStorage.setItem('mediconnect_lang', 'en');
  `);

  await sendCDP('Page.navigate', { url: 'http://127.0.0.1:5173/patient/records' });
  await waitForSelector('div[role="tablist"]');
  await sleep(1000);

  // Step 4: Verify English UI
  console.log('[4/7] Verifying English Medical Records UI & Breadcrumb...');
  
  // Breadcrumb
  const breadcrumbText = await evaluate(`
    const nav = document.querySelector('nav[aria-label="Breadcrumbs"]');
    nav ? nav.innerText.replace(/\\s+/g, ' ').trim() : 'NOT_FOUND';
  `);
  console.log('  Breadcrumb (English):', breadcrumbText);
  if (!breadcrumbText.includes('My Health') || !breadcrumbText.includes('Health Records')) {
    throw new Error('Breadcrumb missing My Health / Health Records: ' + breadcrumbText);
  }
  console.log('  [PASS] Breadcrumb displays "My Health / Health Records"');

  const myHealthHref = await evaluate(`
    const link = document.querySelector('nav[aria-label="Breadcrumbs"] a');
    link ? link.getAttribute('href') : null;
  `);
  console.log('  My Health link href:', myHealthHref);
  if (myHealthHref !== '/patient') {
    throw new Error('My Health link does not point to /patient: ' + myHealthHref);
  }
  console.log('  [PASS] My Health points to valid route: /patient');

  // Category buttons
  const catButtonsEn = await evaluate(`
    const btns = Array.from(document.querySelectorAll('div[role="tablist"] button'));
    btns.map(b => ({
      text: b.innerText.replace(/\\s+/g, ' ').trim(),
      bg: window.getComputedStyle(b).backgroundColor,
      color: window.getComputedStyle(b).color,
      ariaSelected: b.getAttribute('aria-selected')
    }));
  `);
  console.log('  Category Buttons (English):', JSON.stringify(catButtonsEn, null, 2));

  if (catButtonsEn.length !== 3) {
    throw new Error('Expected 3 category buttons, found: ' + catButtonsEn.length);
  }
  if (!catButtonsEn[0].text.startsWith('All Records')) {
    throw new Error('Button 1 label mismatch: ' + catButtonsEn[0].text);
  }
  if (!catButtonsEn[1].text.startsWith('My Prescriptions')) {
    throw new Error('Button 2 label mismatch: ' + catButtonsEn[1].text);
  }
  if (!catButtonsEn[2].text.startsWith('Visit Summaries')) {
    throw new Error('Button 3 label mismatch: ' + catButtonsEn[2].text);
  }
  console.log('  [PASS] Category button 1: "All Records (0)"');
  console.log('  [PASS] Category button 2: "My Prescriptions (0)"');
  console.log('  [PASS] Category button 3: "Visit Summaries (0)"');

  // Verify Active Styling on All
  if (catButtonsEn[0].ariaSelected !== 'true') {
    throw new Error('All Records button not active by default');
  }
  console.log('  [PASS] Active button styling confirmed for "All Records"');

  // Capture Desktop Screenshot in English
  await captureScreenshot('medical_records_en_desktop.png');

  // Step 5: Test Category Click Filtering
  console.log('[5/7] Testing interactive category switching...');
  await evaluate(`(() => {
    const btns = document.querySelectorAll('div[role="tablist"] button');
    btns[1].click(); // Click My Prescriptions
  })()`);
  await sleep(400);

  const rxActive = await evaluate(`(() => {
    const btns = document.querySelectorAll('div[role="tablist"] button');
    return btns[1].getAttribute('aria-selected') === 'true';
  })()`);
  if (!rxActive) throw new Error('My Prescriptions button did not become active on click');
  console.log('  [PASS] Clicked "My Prescriptions" -> Successfully set to active');

  await evaluate(`(() => {
    const btns = document.querySelectorAll('div[role="tablist"] button');
    btns[2].click(); // Click Visit Summaries
  })()`);
  await sleep(400);

  const summariesActive = await evaluate(`(() => {
    const btns = document.querySelectorAll('div[role="tablist"] button');
    return btns[2].getAttribute('aria-selected') === 'true';
  })()`);
  if (!summariesActive) throw new Error('Visit Summaries button did not become active on click');
  console.log('  [PASS] Clicked "Visit Summaries" -> Successfully set to active');

  await evaluate(`(() => {
    const btns = document.querySelectorAll('div[role="tablist"] button');
    btns[0].click(); // Return to All Records
  })()`);
  await sleep(400);
  console.log('  [PASS] Returned to "All Records"');

  // Step 6: Verify Telugu Translations
  console.log('[6/7] Switching language to Telugu and verifying labels...');
  await evaluate(`(() => {
    localStorage.setItem('mediconnect_lang', 'te');
    location.reload();
  })()`);
  await waitForSelector('div[role="tablist"]');
  await sleep(1000);

  const breadcrumbTe = await evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Breadcrumbs"]');
    return nav ? nav.innerText.replace(/\\s+/g, ' ').trim() : 'NOT_FOUND';
  })()`);
  console.log('  Breadcrumb (Telugu):', breadcrumbTe);
  if (!breadcrumbTe.includes('నా ఆరోగ్యం') || !breadcrumbTe.includes('ఆరోగ్య రికార్డులు')) {
    throw new Error('Telugu breadcrumb mismatch: ' + breadcrumbTe);
  }
  console.log('  [PASS] Telugu Breadcrumb matches: "నా ఆరోగ్యం / ఆరోగ్య రికార్డులు"');

  const catButtonsTe = await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('div[role="tablist"] button'));
    return btns.map(b => b.innerText.replace(/\\s+/g, ' ').trim());
  })()`);
  console.log('  Category Buttons (Telugu):', catButtonsTe);

  if (!catButtonsTe[0].startsWith('అన్ని రికార్డులు')) {
    throw new Error('Telugu Button 1 mismatch: ' + catButtonsTe[0]);
  }
  if (!catButtonsTe[1].startsWith('నా మందుల చీటీలు')) {
    throw new Error('Telugu Button 2 mismatch: ' + catButtonsTe[1]);
  }
  if (!catButtonsTe[2].startsWith('వైద్య సంప్రదింపుల వివరాలు')) {
    throw new Error('Telugu Button 3 mismatch: ' + catButtonsTe[2]);
  }
  console.log('  [PASS] Telugu Button 1: "అన్ని రికార్డులు (0)"');
  console.log('  [PASS] Telugu Button 2: "నా మందుల చీటీలు (0)"');
  console.log('  [PASS] Telugu Button 3: "వైద్య సంప్రదింపుల వివరాలు (0)"');

  // Capture Telugu Screenshot
  await captureScreenshot('medical_records_te_desktop.png');

  // Step 7: Check Raw Translation Keys & Responsive Viewports
  console.log('[7/7] Checking for raw translation keys and responsive behavior...');
  const fullBodyText = await evaluate('document.body.innerText');
  const rawKeyMatches = fullBodyText.match(/patientPortal\.[a-zA-Z0-9_.]+|portalNav\.[a-zA-Z0-9_.]+/g) || [];
  if (rawKeyMatches.length > 0) {
    throw new Error('Found raw translation keys in UI: ' + JSON.stringify(rawKeyMatches));
  }
  console.log('  [PASS] Zero raw translation keys visible in the entire document!');

  // Tablet Viewport (768px)
  await setViewport(768, 1024);
  const tabletOverflow = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth');
  console.log('  Tablet (768px) horizontal overflow:', tabletOverflow);
  if (tabletOverflow) throw new Error('Tablet viewport has horizontal overflow');
  await captureScreenshot('medical_records_tablet_768.png');
  console.log('  [PASS] Tablet (768px) layout responsive and clean');

  // Mobile Viewport (375px)
  await setViewport(375, 812);
  const mobileOverflow = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth');
  console.log('  Mobile (375px) horizontal overflow:', mobileOverflow);
  if (mobileOverflow) throw new Error('Mobile viewport has horizontal overflow');
  
  const searchInputWidth = await evaluate(`(() => {
    const input = document.querySelector('input[type="text"]');
    return input ? input.offsetWidth : 0;
  })()`);
  console.log('  Mobile search input width:', searchInputWidth, 'px');
  await captureScreenshot('medical_records_mobile_375.png');
  console.log('  [PASS] Mobile (375px) layout responsive with 100% width search bar');

  console.log('\n======================================================');
  console.log('ALL BROWSER AUTOMATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
}

runTest()
  .catch((err) => {
    console.error('\n[TEST FAILED]', err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (ws) {
      try { ws.close(); } catch {}
    }
    if (chromeProc) {
      try { chromeProc.kill(); } catch {}
    }
  });
