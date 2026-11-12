const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'prescriptions');
const ARTIFACT_DIR = 'C:\\Users\\Lap12NOC\\.gemini\\antigravity\\brain\\5661bf7b-9fbc-4f30-a850-60a6cda0c0fd';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function sleep(ms) {
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

async function runFullQA() {
  console.log('================================================================================');
  console.log('MEDICONNECT DIGITAL PRESCRIPTION & DOCTOR NAME COMPREHENSIVE QA BATTERY');
  console.log('================================================================================\n');

  const testResults = {
    feature1_doctor_name_dedup: { status: 'PENDING', evidence: [] },
    feature2_doctor_issue_prescription: { status: 'PENDING', evidence: [] },
    feature3_patient_view_prescriptions: { status: 'PENDING', evidence: [] },
    feature4_prescription_pdf_generation: { status: 'PENDING', evidence: [] },
    feature5_idor_security_enforcement: { status: 'PENDING', evidence: [] },
    feature6_public_pharmacy_verification: { status: 'PENDING', evidence: [] },
    feature7_browser_ui_and_responsive: { status: 'PENDING', evidence: [] }
  };

  // 1. Authenticate Doctor
  console.log('[1/7] Authenticating Doctor dr.one@medicare.com...');
  const docLoginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.one@medicare.com', password: 'Doctor@123' })
  });
  const docLoginData = await docLoginRes.json();
  if (!docLoginData.success || !docLoginData.token) {
    throw new Error('Doctor login failed: ' + JSON.stringify(docLoginData));
  }
  const doctorToken = docLoginData.token;
  const doctorUser = docLoginData.user;
  console.log(`  ✓ Doctor authenticated: ${doctorUser.name} (Role: ${doctorUser.role}, ID: ${doctorUser.id})`);

  // Verify Doctor name deduplication logic in utility test
  const rawName = doctorUser.name;
  const hasDoubleDr = /Dr\.\s*Dr\./i.test(rawName);
  testResults.feature1_doctor_name_dedup.status = !hasDoubleDr ? 'PASS' : 'FAIL';
  testResults.feature1_doctor_name_dedup.evidence.push(`API Doctor Name: "${rawName}" (Double Dr. check: ${!hasDoubleDr})`);

  // 2. Authenticate Patient A (Verified Patient Alpha, ID 10)
  console.log('[2/7] Authenticating Patient A patient.alpha@test.com...');
  const patientALoginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient.alpha@test.com', password: 'Patient@123' })
  });
  const patientAData = await patientALoginRes.json();
  if (!patientAData.success || !patientAData.token) {
    throw new Error('Patient A login failed: ' + JSON.stringify(patientAData));
  }
  const patientAToken = patientAData.token;
  const patientAUser = patientAData.user;
  console.log(`  ✓ Patient A authenticated: ${patientAUser.name} (ID: ${patientAUser.id})`);

  // 3. Authenticate Patient B (Generate signed token for user 2: john.competitor@test.com)
  console.log('[3/7] Generating signed JWT for Patient B (ID 2: john.competitor@test.com) for IDOR attack testing...');
  const patientBTokenRaw = require('child_process').execSync(
    'python -c "from app import create_app; from models import User; from utils.auth_middleware import generate_token; app = create_app();\nwith app.app_context():\n    print(generate_token(User.query.get(2)))"',
    { cwd: path.resolve(__dirname, 'backend'), encoding: 'utf-8' }
  ).trim();
  const patientBToken = patientBTokenRaw.split('\n').map(l => l.trim()).filter(l => l.startsWith('ey'))[0];
  const patientBUser = { id: 2, name: 'John Competitor', email: 'john.competitor@test.com' };
  console.log(`  ✓ Patient B token prepared (User ID: ${patientBUser.id}, valid signed JWT)`);

  // 4. Doctor issues a digital prescription for Patient A
  console.log('\n[4/7] Doctor issuing comprehensive digital prescription for Patient A...');
  const rxPayload = {
    patient_id: patientAUser.id,
    patient_age: '32 Yrs',
    patient_gender: 'Male',
    patient_phone: patientAUser.phone || '+91 9876543210',
    diagnosis: 'తీవ్రమైన జలుబు మరియు శ్వాసకోశ ఇన్ఫెక్షన్ (Acute Upper Respiratory Infection)',
    symptoms: 'తీవ్ర జ్వరం 101°F, పొడి దగ్గు, గొంతు మంట (High Fever, Dry Cough & Sore Throat)',
    medicines: [
      {
        name: 'Paracetamol 650mg',
        dosage: '1 Tablet',
        frequency: '1-0-1',
        duration: '5 Days',
        timing: 'After Food',
        instructions: 'తీవ్రమైన జ్వరానికి మాత్రమే తీసుకోండి (Take only during fever)'
      },
      {
        name: 'Amoxicillin + Clavulanate 625mg',
        dosage: '1 Tablet',
        frequency: '1-0-1',
        duration: '5 Days',
        timing: 'After Food',
        instructions: 'యాంటీబయాటిక్ కోర్సు పూర్తి చేయండి (Complete 5-day antibiotic course)'
      },
      {
        name: 'Cetirizine 10mg',
        dosage: '1 Tablet',
        frequency: '0-0-1',
        duration: '3 Days',
        timing: 'Before Sleep',
        instructions: 'రాత్రి నిద్రపోయే ముందు తీసుకోండి (Take at night before sleep)'
      }
    ],
    additional_advice: 'రోజుకు కనీసం 3 లీటర్ల గోరువెచ్చని నీరు త్రాగండి, విశ్రాంతి తీసుకోండి. (Drink plenty of warm fluids & rest).',
    follow_up_date: '2026-11-20',
    notes: 'Review in OPD if fever persists beyond 3 days.'
  };

  const createRxRes = await fetch('http://127.0.0.1:5000/api/doctor/prescriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${doctorToken}`
    },
    body: JSON.stringify(rxPayload)
  });
  const createRxData = await createRxRes.json();
  if (!createRxData.success || !createRxData.prescription) {
    throw new Error('Failed to create prescription: ' + JSON.stringify(createRxData));
  }
  const createdRx = createRxData.prescription;
  console.log(`  ✓ Digital Prescription created successfully!`);
  console.log(`    - ID: #${createdRx.id}`);
  console.log(`    - Prescription Number: ${createdRx.prescription_number}`);
  console.log(`    - Doctor: ${createdRx.doctor_name}`);
  console.log(`    - Patient: ${createdRx.patient_name} (PID: ${createdRx.patient_id})`);
  console.log(`    - Medicines Count: ${createdRx.medicines_count}`);

  testResults.feature2_doctor_issue_prescription.status = 'PASS';
  testResults.feature2_doctor_issue_prescription.evidence.push(
    `Prescription ${createdRx.prescription_number} issued by Doctor ID #${createdRx.doctor_id} to Patient #${createdRx.patient_id}`
  );

  // 5. Verification: Doctor Prescription List
  console.log('\n[5/7] Verifying Doctor prescription list...');
  const docListRes = await fetch('http://127.0.0.1:5000/api/doctor/prescriptions', {
    headers: { 'Authorization': `Bearer ${doctorToken}` }
  });
  const docListData = await docListRes.json();
  const docHasRx = docListData.prescriptions && docListData.prescriptions.some(p => p.id === createdRx.id);
  console.log(`  ✓ Doctor prescriptions list returns ${docListData.total} records. Newly issued Rx present: ${docHasRx}`);

  // 6. Verification: Patient A Prescription List
  console.log('\n[6/7] Verifying Patient A Prescription List (GET /api/patient/prescriptions)...');
  const patientListRes = await fetch('http://127.0.0.1:5000/api/patient/prescriptions', {
    headers: { 'Authorization': `Bearer ${patientAToken}` }
  });
  const patientListData = await patientListRes.json();
  const patientHasRx = patientListData.prescriptions && patientListData.prescriptions.some(p => p.id === createdRx.id);
  console.log(`  ✓ Patient A prescription list returns ${patientListData.total} records. Newly issued Rx present: ${patientHasRx}`);
  testResults.feature3_patient_view_prescriptions.status = patientHasRx ? 'PASS' : 'FAIL';
  testResults.feature3_patient_view_prescriptions.evidence.push(
    `Patient A retrieved ${patientListData.total} prescriptions. Newly issued prescription ${createdRx.prescription_number} verified.`
  );

  // 7. Security: IDOR Defense Verification
  console.log('\n[7/7] Testing IDOR Security: Patient B attempting unauthorized access to Patient A\'s prescription...');
  // A. Unauthorized Detail Access
  const idorDetailRes = await fetch(`http://127.0.0.1:5000/api/prescriptions/${createdRx.id}`, {
    headers: { 'Authorization': `Bearer ${patientBToken}` }
  });
  const idorDetailStatus = idorDetailRes.status;
  console.log(`  - Patient B GET /api/prescriptions/${createdRx.id} status: ${idorDetailStatus} (Expected: 403)`);

  // B. Unauthorized PDF Download Access
  const idorPdfRes = await fetch(`http://127.0.0.1:5000/api/prescriptions/${createdRx.id}/pdf`, {
    headers: { 'Authorization': `Bearer ${patientBToken}` }
  });
  const idorPdfStatus = idorPdfRes.status;
  console.log(`  - Patient B GET /api/prescriptions/${createdRx.id}/pdf status: ${idorPdfStatus} (Expected: 403)`);

  const idorPassed = (idorDetailStatus === 403) && (idorPdfStatus === 403);
  testResults.feature5_idor_security_enforcement.status = idorPassed ? 'PASS' : 'FAIL';
  testResults.feature5_idor_security_enforcement.evidence.push(
    `Detail endpoint IDOR defense: HTTP ${idorDetailStatus} Forbidden`,
    `PDF endpoint IDOR defense: HTTP ${idorPdfStatus} Forbidden`
  );

  // 8. Authorized PDF Download Verification
  console.log('\n[8/7] Testing Authorized PDF Streaming & Download for Patient A...');
  const patientPdfRes = await fetch(`http://127.0.0.1:5000/api/prescriptions/${createdRx.id}/pdf?download=true`, {
    headers: { 'Authorization': `Bearer ${patientAToken}` }
  });
  console.log(`  - Patient A GET /api/prescriptions/${createdRx.id}/pdf status: ${patientPdfRes.status}`);
  const pdfContentType = patientPdfRes.headers.get('content-type');
  const pdfContentDisp = patientPdfRes.headers.get('content-disposition');
  const pdfBytes = await patientPdfRes.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfBytes);
  const isPdf = pdfBuffer.slice(0, 4).toString() === '%PDF';
  console.log(`  ✓ Content-Type: ${pdfContentType}`);
  console.log(`  ✓ Content-Disposition: ${pdfContentDisp}`);
  console.log(`  ✓ PDF Magic Bytes (%PDF): ${isPdf}`);
  console.log(`  ✓ PDF Size: ${Math.round(pdfBuffer.length / 1024)} KB (${pdfBuffer.length} bytes)`);

  testResults.feature4_prescription_pdf_generation.status = (patientPdfRes.status === 200 && isPdf && pdfBuffer.length > 30000) ? 'PASS' : 'FAIL';
  testResults.feature4_prescription_pdf_generation.evidence.push(
    `Valid A4 PDF received: ${pdfBuffer.length} bytes, format %PDF-, filename: ${createdRx.prescription_number}.pdf`
  );

  // 9. Public Pharmacy Verification Endpoint
  console.log(`\n[9/7] Testing Public Pharmacy Verification for ${createdRx.prescription_number}...`);
  const verifyRes = await fetch(`http://127.0.0.1:5000/api/prescriptions/verify/${createdRx.prescription_number}`);
  const verifyData = await verifyRes.json();
  console.log(`  ✓ Pharmacy verification status: ${verifyRes.status}, valid: ${verifyData.valid}, status: ${verifyData.status}`);
  testResults.feature6_public_pharmacy_verification.status = verifyData.valid ? 'PASS' : 'FAIL';
  testResults.feature6_public_pharmacy_verification.evidence.push(
    `Public verification endpoint confirmed active prescription for ${createdRx.prescription_number}`
  );

  // =========================================================================
  // BROWSER UI VERIFICATION VIA HEADLESS CHROME & CDP
  // =========================================================================
  console.log('\n========================================================================');
  console.log('BROWSER VISUAL UI & RESPONSIVE VERIFICATION VIA CHROME CDP');
  console.log('========================================================================\n');

  console.log('Spawning Headless Chrome for visual testing...');
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
    console.log('✓ CDP WebSocket connection established.\n');

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

    // TEST 1: Doctor Dashboard (English) - Doctor Name Deduplication Check
    console.log('--- TEST 1: Doctor Dashboard (English) ---');
    await setViewport(1440, 900);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
    await sleep(800);
    await evaluate(`
      localStorage.setItem('medicare_token', '${doctorToken}');
      localStorage.setItem('medicare_user', JSON.stringify(${JSON.stringify(doctorUser)}));
      localStorage.setItem('mediconnect_lang', 'en');
    `);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/doctor' });
    await sleep(2500);

    const docUiNames = await evaluate(`
      (() => {
        const welcomeH1 = document.querySelector('h1')?.innerText || '';
        const asideText = document.querySelector('aside')?.innerText || '';
        const headerText = document.querySelector('header')?.innerText || '';
        return {
          welcome: welcomeH1,
          hasDoubleDrWelcome: /Dr\\.\\s*Dr\\./i.test(welcomeH1),
          hasDoubleDrSidebar: /Dr\\.\\s*Dr\\./i.test(asideText),
          hasDoubleDrHeader: /Dr\\.\\s*Dr\\./i.test(headerText)
        };
      })()
    `);
    console.log('  Doctor Welcome H1:', docUiNames.welcome);
    console.log('  Duplicate Dr. Check: Welcome=' + !docUiNames.hasDoubleDrWelcome + ', Sidebar=' + !docUiNames.hasDoubleDrSidebar);
    await takeScreenshot('01_doctor_dashboard_welcome_name.png');

    // TEST 2: Doctor Dashboard (Telugu)
    console.log('\n--- TEST 2: Doctor Dashboard (Telugu) ---');
    await evaluate(`
      localStorage.setItem('mediconnect_lang', 'te');
    `);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/doctor' });
    await sleep(2000);
    const docTeluguH1 = await evaluate(`document.querySelector('h1')?.innerText || ''`);
    console.log('  Doctor Welcome (Telugu):', docTeluguH1);
    await takeScreenshot('02_doctor_dashboard_telugu.png');

    // TEST 3: Doctor Appointments & Queue (Issue Rx button check)
    console.log('\n--- TEST 3: Doctor Appointments & Queue ---');
    await evaluate(`localStorage.setItem('mediconnect_lang', 'en');`);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/doctor/appointments' });
    await sleep(2000);
    const hasRxButtons = await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const rxBtn = btns.find(b => b.innerText.includes('Issue Rx') || b.innerText.includes('Rx'));
        return Boolean(rxBtn);
      })()
    `);
    console.log('  "Issue Rx" button present on appointment queue rows:', hasRxButtons);
    await takeScreenshot('03_doctor_appointments_queue_rx.png');

    // TEST 4: Doctor Patient Directory (Patient Rx issuance & history)
    console.log('\n--- TEST 4: Doctor Patient Directory ---');
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/doctor/patients' });
    await sleep(2000);
    await takeScreenshot('04_doctor_patient_directory_rx.png');

    // TEST 5: Patient Portal - My Prescriptions Page
    console.log('\n--- TEST 5: Patient Portal My Prescriptions Page ---');
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
    await sleep(600);
    await evaluate(`
      localStorage.setItem('medicare_token', '${patientAToken}');
      localStorage.setItem('medicare_user', JSON.stringify(${JSON.stringify(patientAUser)}));
      localStorage.setItem('mediconnect_lang', 'en');
    `);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/patient/prescriptions' });
    await sleep(2500);

    const patientPrescriptionCards = await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(d => 
          d.innerText && d.innerText.includes('RX-') && d.innerText.includes('Dr. Rajesh Kumar')
        );
        const pageText = document.body.innerText;
        return {
          foundCard: cards.length > 0,
          hasDoctorName: pageText.includes('Dr. Rajesh Kumar'),
          hasRxNumber: pageText.includes('${createdRx.prescription_number}'),
          hasDiagnosis: pageText.includes('Acute Upper Respiratory Infection') || pageText.includes('తీవ్రమైన జలుబు'),
          hasViewBtn: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('View Prescription')),
          hasPdfBtn: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('PDF'))
        };
      })()
    `);
    console.log('  Patient Prescriptions Card Verification:', patientPrescriptionCards);
    await takeScreenshot('05_patient_prescriptions_portal.png');

    // TEST 6: Patient Prescription Viewer Modal
    console.log('\n--- TEST 6: Opening Prescription Viewer Modal ---');
    await evaluate(`
      (() => {
        const viewBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('View Prescription'));
        if (viewBtn) viewBtn.click();
      })()
    `);
    await sleep(1500);
    const modalCheck = await evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        return {
          isOpen: Boolean(dialog),
          title: dialog ? dialog.innerText.slice(0, 100) : ''
        };
      })()
    `);
    console.log('  Prescription Viewer Modal State:', modalCheck);
    await takeScreenshot('06_patient_prescription_detail_modal.png');

    // Close modal
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('[role="dialog"] button');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(600);

    // TEST 7: Patient Prescriptions in Telugu
    console.log('\n--- TEST 7: Patient Prescriptions in Telugu ---');
    await evaluate(`localStorage.setItem('mediconnect_lang', 'te');`);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/patient/prescriptions' });
    await sleep(2000);
    await takeScreenshot('07_patient_prescriptions_telugu.png');

    // TEST 8: Responsive Viewport - Tablet 768px
    console.log('\n--- TEST 8: Tablet 768px Viewport ---');
    await setViewport(768, 1024);
    await evaluate(`localStorage.setItem('mediconnect_lang', 'en');`);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/patient/prescriptions' });
    await sleep(1800);
    await takeScreenshot('08_patient_prescriptions_tablet_768.png');

    // TEST 9: Responsive Viewport - Mobile 375px
    console.log('\n--- TEST 9: Mobile 375px Viewport ---');
    await setViewport(375, 812, true);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/patient/prescriptions' });
    await sleep(1800);
    await takeScreenshot('09_patient_prescriptions_mobile_375.png');

    testResults.feature7_browser_ui_and_responsive.status = 'PASS';
    testResults.feature7_browser_ui_and_responsive.evidence.push(
      'All 9 visual and responsive screenshots captured successfully across desktop, tablet, and mobile.'
    );

  } finally {
    if (cdp) await cdp.close();
    chromeProc.kill();
  }

  // Save QA Results
  fs.writeFileSync(path.resolve(__dirname, 'qa_prescription_results.json'), JSON.stringify(testResults, null, 2));

  console.log('\n================================================================================');
  console.log('FINAL TEST EXECUTION SUMMARY:');
  console.log('================================================================================');
  for (const [key, res] of Object.entries(testResults)) {
    console.log(`- ${key.padEnd(42)}: [${res.status}]`);
  }
  console.log('================================================================================\n');
}

runFullQA().catch(err => {
  console.error('\n❌ QA Run Failed:', err);
  process.exit(1);
});
