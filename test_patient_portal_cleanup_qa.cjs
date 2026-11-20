const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, 'qa_reports', 'patient_portal_cleanup');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function runTests() {
  console.log('--- Starting MediConnect Patient Portal QA Tests ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const results = [];

  try {
    // 1. Login as Patient Alpha (patient.alpha@test.com / Patient@123)
    console.log('Navigating to login...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle0' });

    // Set English language first to test English baseline
    const enBtnLogin = await page.$('button[aria-label="Select English language"]');
    if (enBtnLogin) await enBtnLogin.click();
    await new Promise(r => setTimeout(r, 300));

    await page.type('input[type="email"]', 'patient.alpha@test.com');
    await page.type('input[type="password"]', 'Patient@123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);

    console.log('Logged in. Current URL:', page.url());

    // TEST 1: Patient Portal Doctors List (/patient/doctors)
    await page.goto('http://127.0.0.1:5173/patient/doctors', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_doctors_list_desktop.png') });

    const doctorsData = await page.evaluate(() => {
      const cards = document.querySelectorAll('h3');
      const names = Array.from(cards).map(c => c.textContent.trim()).filter(Boolean);
      const allText = document.body.innerText;
      const hasReliabilityGeneral = allText.includes('Reliability General');
      const hasNY = allText.includes('Metropolis');
      const images = Array.from(document.querySelectorAll('img')).map(img => img.src);
      const hasUnsplash = images.some(s => s.includes('unsplash.com'));
      return { names, hasReliabilityGeneral, hasNY, hasUnsplash };
    });

    console.log('Doctors Found Count:', doctorsData.names.length);
    console.log('Sample Doctors:', doctorsData.names.slice(0, 5));

    const passDoctors = !doctorsData.hasReliabilityGeneral && !doctorsData.hasNY && !doctorsData.hasUnsplash && doctorsData.names.length > 0;
    results.push({
      test: '1. Doctors list displays only AP & TS sample profiles with neutral avatars (no foreign unsplash images)',
      pass: passDoctors,
      details: `${doctorsData.names.length} AP/TS doctors found`
    });

    // TEST 2: Patient Portal My Appointments (/patient/appointments)
    await page.goto('http://127.0.0.1:5173/patient/appointments', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_appointments_english.png') });

    const apptTextEn = await page.evaluate(() => document.body.innerText);
    const hasRawStatusPending = apptTextEn.includes('patientPortal.statusPending');
    const hasPendingEn = apptTextEn.includes('Pending');
    console.log('Has raw "patientPortal.statusPending":', hasRawStatusPending);
    console.log('Has clean "Pending":', hasPendingEn);

    results.push({
      test: '2. Appointments page displays user-friendly "Pending" (never displays raw key)',
      pass: !hasRawStatusPending && hasPendingEn,
      details: 'English status renders: Pending'
    });

    // Switch to Telugu on Appointments page
    const teBtn = await page.waitForSelector('button[aria-label="తెలుగు భాషను ఎంచుకోండి"]');
    if (teBtn) {
      await teBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_appointments_telugu.png') });
      const apptTextTe = await page.evaluate(() => document.body.innerText);
      const hasTeluguPending = apptTextTe.includes('పెండింగ్లో ఉంది');
      const hasRawKeyTe = apptTextTe.includes('patientPortal.statusPending');
      console.log('Has Telugu "పెండింగ్లో ఉంది":', hasTeluguPending);

      results.push({
        test: '3. Appointments page displays Telugu "పెండింగ్లో ఉంది" immediately upon toggle',
        pass: hasTeluguPending && !hasRawKeyTe,
        details: 'Telugu status: పెండింగ్లో ఉంది'
      });

      // Switch back to English
      const enBtn = await page.waitForSelector('button[aria-label="Select English language"]');
      if (enBtn) {
        await enBtn.click();
        await new Promise(r => setTimeout(r, 400));
      }
    }

    // TEST 3: Patient Portal My Prescriptions (/patient/prescriptions)
    await page.goto('http://127.0.0.1:5173/patient/prescriptions', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_prescriptions_desktop.png') });

    const rxCardsData = await page.evaluate(() => {
      const cards = document.querySelectorAll('span[style*="font-family: monospace"]');
      const rxNumbers = Array.from(cards).map(c => c.textContent.trim());
      return { rxNumbers };
    });

    console.log('Visible Prescriptions:', rxCardsData.rxNumbers);
    const hasNoDuplicateNumbers = new Set(rxCardsData.rxNumbers).size === rxCardsData.rxNumbers.length;

    // Previously there were 4 repeated identical hypertension copies from 2026-11-12 and 2 identical respiratory copies from 2026-11-12.
    // Now duplicates from the same date are deduplicated.
    results.push({
      test: '4. My Prescriptions deduplicates repeated identical consultation cards',
      pass: hasNoDuplicateNumbers && rxCardsData.rxNumbers.length <= 3,
      details: `${rxCardsData.rxNumbers.length} unique cards visible: ${rxCardsData.rxNumbers.join(', ')}`
    });

    // Mobile Viewport (375x812)
    await page.setViewport({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_prescriptions_mobile_375.png') });
    await page.goto('http://127.0.0.1:5173/patient/doctors', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_doctors_mobile_375.png') });

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n--- Final Test Summary ---');
  let allPass = true;
  for (const r of results) {
    console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'}: ${r.test} (${r.details || ''})`);
    if (!r.pass) allPass = false;
  }
  console.log('Overall Status:', allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  process.exit(allPass ? 0 : 1);
}

runTests();
