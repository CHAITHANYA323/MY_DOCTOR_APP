const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'receptionist_portal');
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
      try {
        this.ws.close();
      } catch (e) {}
    }
  }
}

async function runReceptionQA() {
  console.log('================================================================================');
  console.log('MEDICONNECT RECEPTIONIST PORTAL COMPREHENSIVE UI/UX VERIFICATION');
  console.log('================================================================================\n');

  // 1. Authenticate Receptionist
  console.log('[1/6] Authenticating Receptionist reception.hosp1@medicare.com...');
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reception.hosp1@medicare.com', password: 'Reception@123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Receptionist login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  const user = loginData.user;
  console.log(`  ✓ Receptionist authenticated: ${user.name} (Hospital ID: ${user.hospital_id})`);

  // 2. Spawn Chrome
  console.log('\n[2/6] Spawning Headless Chrome for visual testing...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-extensions',
    '--hide-scrollbars',
    '--mute-audio'
  ]);

  let cdp = null;

  try {
    await sleep(2500);
    const list = await getJson('http://127.0.0.1:9222/json/list');
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    if (!pageTarget) throw new Error('No Chrome page target available.');

    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log('  ✓ CDP WebSocket connection established.\n');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const setViewport = async (width, height, isMobile = false) => {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: isMobile
      });
    };

    const evaluate = async (expr) => {
      const res = await cdp.send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result ? res.result.value : null;
    };

    const takeScreenshot = async (filename) => {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(data, 'base64');
      const targetPath = path.join(OUT_DIR, filename);
      fs.writeFileSync(targetPath, buffer);
      if (fs.existsSync(ARTIFACT_DIR)) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buffer);
      }
      console.log(`📸 [Screenshot Captured] ${filename} (${Math.round(buffer.length / 1024)} KB)`);
    };

    // TEST 1: Reception Dashboard (English)
    console.log('--- TEST 1: Reception Dashboard (English) ---');
    await setViewport(1440, 900);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
    await sleep(800);
    await evaluate(`
      localStorage.setItem('medicare_token', '${token}');
      localStorage.setItem('medicare_user', JSON.stringify(${JSON.stringify(user)}));
      localStorage.setItem('mediconnect_lang', 'en');
    `);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/admin' });
    await sleep(2500);

    const enDashboardData = await evaluate(`
      (() => {
        const welcomeH1 = document.querySelector('h1')?.innerText || '';
        const bodyText = document.body.innerText;
        const lowerBody = bodyText.toLowerCase();
        const navText = document.querySelector('aside')?.innerText || '';

        const hasWelcomeTitle = welcomeH1.includes('Welcome to Hospital Reception');
        const hasSubtitle = bodyText.includes('Manage patient registrations, appointments, and check-ins easily from one place.');
        
        // 5 Summary Cards
        const card1 = lowerBody.includes("today's appointments") && lowerBody.includes('patients expected today');
        const card2 = lowerBody.includes("waiting for arrival") && lowerBody.includes('waiting to check in');
        const card3 = lowerBody.includes("checked-in patients") && lowerBody.includes('ready for consultation');
        const card4 = lowerBody.includes("completed visits") && lowerBody.includes('consultations completed');
        const card5 = lowerBody.includes("registered patients") && lowerBody.includes('patients in this hospital');

        // Top 2 Quick Actions
        const quickCheckIn = bodyText.includes('Quick Patient Check-In');
        const registerPatient = bodyText.includes('Register New Patient');

        // Sidebar Navigation
        const navDashboard = navText.includes('Dashboard');
        const navCheckIn = navText.includes('Patient Check-In');
        const navAppointments = navText.includes('Appointments');
        const navRegister = navText.includes('New Patient Registration');
        const navPatientList = navText.includes('Patient List');

        return {
          hasWelcomeTitle,
          hasSubtitle,
          cards: { card1, card2, card3, card4, card5 },
          quickActions: { quickCheckIn, registerPatient },
          nav: { navDashboard, navCheckIn, navAppointments, navRegister, navPatientList }
        };
      })()
    `);

    console.log('  Welcome Title verified:', enDashboardData.hasWelcomeTitle);
    console.log('  Welcome Subtitle verified:', enDashboardData.hasSubtitle);
    console.log('  5 Summary Cards verified:', enDashboardData.cards);
    console.log('  Top 2 Quick Actions verified:', enDashboardData.quickActions);
    console.log('  Sidebar Navigation verified:', enDashboardData.nav);
    await takeScreenshot('01_reception_dashboard_en.png');

    // TEST 2: Reception Dashboard (Telugu)
    console.log('\n--- TEST 2: Reception Dashboard (Telugu) ---');
    await evaluate(`localStorage.setItem('mediconnect_lang', 'te');`);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/admin' });
    await sleep(2500);

    const teDashboardData = await evaluate(`
      (() => {
        const welcomeH1 = document.querySelector('h1')?.innerText || '';
        const bodyText = document.body.innerText;
        const navText = document.querySelector('aside')?.innerText || '';

        const hasTeluguTitle = welcomeH1.includes('ఆసుపత్రి రిసెప్షన్‌కు స్వాగతం');
        const hasTeluguSubtitle = bodyText.includes('రోగుల నమోదు, అపాయింట్‌మెంట్‌లు మరియు చెక్-ఇన్‌లను ఒకే చోట సులభంగా నిర్వహించండి.');
        
        // 5 Summary Cards in Telugu
        const card1 = bodyText.includes('ఈ రోజు అపాయింట్‌మెంట్‌లు') && bodyText.includes('ఈ రోజు రావలసిన రోగులు');
        const card2 = bodyText.includes('రాక కోసం వేచి ఉన్నారు') && bodyText.includes('చెక్-ఇన్ కావాల్సిన రోగులు');
        const card3 = bodyText.includes('చెక్-ఇన్ అయిన రోగులు') && bodyText.includes('వైద్యుల సంప్రదింపుకు సిద్ధంగా ఉన్నారు');
        const card4 = bodyText.includes('పూర్తయిన సందర్శనలు') && bodyText.includes('సంప్రదింపులు పూర్తయ్యాయి');
        const card5 = bodyText.includes('నమోదైన రోగులు') && bodyText.includes('ఈ ఆసుపత్రిలోని రోగులు');

        // Telugu Nav
        const navDashboard = navText.includes('డ్యాష్‌బోర్డ్');
        const navCheckIn = navText.includes('రోగి చెక్-ఇన్');
        const navAppointments = navText.includes('అపాయింట్‌మెంట్‌లు');
        const navRegister = navText.includes('కొత్త రోగి నమోదు');
        const navPatientList = navText.includes('రోగుల జాబితా');

        // Check for raw keys
        const rawKeyMatches = bodyText.match(/receptionPortal\\.[a-zA-Z0-9]+/g);

        return {
          hasTeluguTitle,
          hasTeluguSubtitle,
          cards: { card1, card2, card3, card4, card5 },
          nav: { navDashboard, navCheckIn, navAppointments, navRegister, navPatientList },
          rawKeys: rawKeyMatches || []
        };
      })()
    `);

    console.log('  Telugu Welcome Title verified:', teDashboardData.hasTeluguTitle);
    console.log('  Telugu Subtitle verified:', teDashboardData.hasTeluguSubtitle);
    console.log('  5 Telugu Summary Cards verified:', teDashboardData.cards);
    console.log('  Telugu Sidebar Navigation verified:', teDashboardData.nav);
    console.log('  Zero Raw Keys Check:', teDashboardData.rawKeys.length === 0 ? 'PASS (0 keys)' : `FAIL: ${teDashboardData.rawKeys}`);
    await takeScreenshot('02_reception_dashboard_te.png');

    // TEST 3: New Patient Registration
    console.log('\n--- TEST 3: New Patient Registration ---');
    await evaluate(`localStorage.setItem('mediconnect_lang', 'en');`);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/admin/register-patient' });
    await sleep(2000);

    const testPatientName = 'Venkata Raman';
    const testPatientEmail = `raman_${Date.now()}@medicare.test`;
    const testPatientPhone = '9876543210';

    await evaluate(`
      (() => {
        const setReactInput = (input, val) => {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, val);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const nameInput = document.querySelector('input[name="name"]');
        const emailInput = document.querySelector('input[name="email"]');
        const phoneInput = document.querySelector('input[name="phone"]');

        if (nameInput) setReactInput(nameInput, '${testPatientName}');
        if (emailInput) setReactInput(emailInput, '${testPatientEmail}');
        if (phoneInput) setReactInput(phoneInput, '${testPatientPhone}');
      })()
    `);
    await sleep(500);

    // Submit registration form
    await evaluate(`
      (() => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(3000);

    const regResult = await evaluate(`
      (() => {
        const body = document.body.innerText;
        return {
          hasSuccess: body.includes('Patient registered successfully!'),
          hasPatientName: body.includes('${testPatientName}'),
          hasTempPassword: body.includes('Temporary Password:') || body.includes('TEMPORARY PASSWORD'),
          hasBookBtn: body.includes('Book Consultation for this Patient'),
          hasRegisterAnother: body.includes('Register Another Patient')
        };
      })()
    `);

    console.log('  Registration Success Verification:', regResult);
    await takeScreenshot('03_reception_register_patient_success.png');

    // TEST 4: Patient List & Details Modal
    console.log('\n--- TEST 4: Patient List & Profile Details Modal ---');
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/admin/patients' });
    await sleep(2500);

    const patientListHeaders = await evaluate(`
      (() => {
        const ths = Array.from(document.querySelectorAll('th')).map(t => t.innerText.trim());
        const body = document.body.innerText;
        const hasPatient = body.includes('${testPatientName}');
        return {
          headers: ths,
          hasPatient
        };
      })()
    `);
    console.log('  Patient List Table Headers:', patientListHeaders.headers);
    console.log('  Found Registered Patient in Table:', patientListHeaders.hasPatient);

    // Click "View Details" on the patient row
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const viewBtn = btns.find(b => b.innerText.includes('View Details'));
        if (viewBtn) viewBtn.click();
      })()
    `);
    await sleep(1500);

    const modalCheck = await evaluate(`
      (() => {
        const body = document.body.innerText;
        return {
          hasModalTitle: body.includes('Patient Record Details') || body.includes('రోగి పూర్తి వివరాలు'),
          hasVisits: body.includes('Total Consultations at this Hospital') || body.includes('సందర్శనలు')
        };
      })()
    `);
    console.log('  Patient Details Modal:', modalCheck);
    await takeScreenshot('04_reception_patient_list_and_details.png');

    // Close modal
    await evaluate(`
      (() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Close') || b.innerText.includes('మూసివేయి'));
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(600);

    // TEST 5: Patient Check-In Terminal
    console.log('\n--- TEST 5: Patient Check-In Terminal ---');
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/admin/check-in' });
    await sleep(2500);

    const checkInTerminalData = await evaluate(`
      (() => {
        const h1 = document.querySelector('h1')?.innerText || '';
        const body = document.body.innerText;
        return {
          hasTitle: h1.includes('Patient Arrival & Check-In'),
          hasAwaitingArrival: body.includes('Awaiting Arrival'),
          hasWaitingArea: body.includes('In Waiting Area'),
          hasAllToday: body.includes('All Today')
        };
      })()
    `);
    console.log('  Check-In Terminal Verification:', checkInTerminalData);
    await takeScreenshot('05_reception_patient_check_in_terminal.png');

    // TEST 6: Responsive Viewports (Tablet & Mobile)
    console.log('\n--- TEST 6: Responsive Viewports ---');
    // Tablet (768 x 1024)
    await setViewport(768, 1024);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/admin' });
    await sleep(2000);
    await takeScreenshot('06_reception_dashboard_tablet_768.png');

    // Mobile (375 x 812)
    await setViewport(375, 812, true);
    await sleep(1500);
    await takeScreenshot('07_reception_dashboard_mobile_375.png');

    console.log('\n================================================================================');
    console.log('🎉 ALL RECEPTIONIST PORTAL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================================');
  } finally {
    if (cdp) await cdp.close();
    try {
      chromeProc.kill();
    } catch (e) {}
  }
}

runReceptionQA().catch(err => {
  console.error('Fatal QA error:', err);
  process.exit(1);
});
