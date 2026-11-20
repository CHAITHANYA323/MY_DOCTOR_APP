const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, 'qa_reports', 'welcome_toggle');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function runTests() {
  console.log('--- Starting Welcome Language Toggle Tests ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const results = [];

  try {
    // 1. Open Welcome Page
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

    // Set language to English via clicking the English toggle button
    const enBtn = await page.waitForSelector('button[aria-label="Select English language"]');
    await enBtn.click();
    await new Promise(r => setTimeout(r, 300));

    // Scenario 1: English selected -> only "Get Started"
    let buttonText = await page.$eval('button[aria-label*="Navigate to Login"] span', el => el.textContent.trim());
    console.log('Scenario 1 (English) Button Text:', JSON.stringify(buttonText));
    const pass1 = buttonText === 'Get Started';
    results.push({ scenario: '1. English selected displays "Get Started"', pass: pass1, text: buttonText });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_welcome_english_desktop.png') });

    // Scenario 2: Switch to Telugu -> only "ప్రారంభించండి"
    const teBtn = await page.waitForSelector('button[aria-label="తెలుగు భాషను ఎంచుకోండి"]');
    await teBtn.click();
    await new Promise(r => setTimeout(r, 300));

    buttonText = await page.$eval('button[aria-label*="Navigate to Login"] span', el => el.textContent.trim());
    console.log('Scenario 2 (Telugu) Button Text:', JSON.stringify(buttonText));
    const pass2 = buttonText === 'ప్రారంభించండి';
    results.push({ scenario: '2. Telugu selected displays "ప్రారంభించండి"', pass: pass2, text: buttonText });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_welcome_telugu_desktop.png') });

    // Scenario 3: Switch back to English -> only "Get Started"
    await enBtn.click();
    await new Promise(r => setTimeout(r, 300));

    buttonText = await page.$eval('button[aria-label*="Navigate to Login"] span', el => el.textContent.trim());
    console.log('Scenario 3 (Switch back to English) Button Text:', JSON.stringify(buttonText));
    const pass3 = buttonText === 'Get Started';
    results.push({ scenario: '3. Switch back to English displays "Get Started"', pass: pass3, text: buttonText });

    // Scenario 4: Refresh page -> previously selected language persists
    await page.reload({ waitUntil: 'networkidle0' });
    buttonText = await page.$eval('button[aria-label*="Navigate to Login"] span', el => el.textContent.trim());
    console.log('Scenario 4 (Persists after refresh - English) Button Text:', JSON.stringify(buttonText));
    const pass4a = buttonText === 'Get Started';

    // Switch to Telugu and refresh again to verify persistence of Telugu
    const teBtnAfterRefresh = await page.waitForSelector('button[aria-label="తెలుగు భాషను ఎంచుకోండి"]');
    await teBtnAfterRefresh.click();
    await new Promise(r => setTimeout(r, 300));
    await page.reload({ waitUntil: 'networkidle0' });
    buttonText = await page.$eval('button[aria-label*="Navigate to Login"] span', el => el.textContent.trim());
    console.log('Scenario 4 (Persists after refresh - Telugu) Button Text:', JSON.stringify(buttonText));
    const pass4b = buttonText === 'ప్రారంభించండి';
    results.push({ scenario: '4. Language persists after reload', pass: pass4a && pass4b, text: buttonText });

    // Also check Mobile viewport (375x812)
    await page.setViewport({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_welcome_telugu_mobile_375.png') });
    const enBtnMobile = await page.waitForSelector('button[aria-label="Select English language"]');
    await enBtnMobile.click();
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_welcome_english_mobile_375.png') });

    // Scenario 5: Clicking the button still navigates to the existing Login page
    const getStartedBtn = await page.waitForSelector('button[aria-label*="Navigate to Login"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      getStartedBtn.click()
    ]);

    const currentUrl = page.url();
    console.log('Scenario 5 Navigated URL:', currentUrl);
    const pass5 = currentUrl.includes('/login');
    results.push({ scenario: '5. Button navigates to /login', pass: pass5, url: currentUrl });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_navigated_to_login.png') });

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n--- Test Results Summary ---');
  let allPass = true;
  for (const r of results) {
    console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'}: ${r.scenario} (Details: ${r.text || r.url || ''})`);
    if (!r.pass) allPass = false;
  }
  console.log('Overall Status:', allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  process.exit(allPass ? 0 : 1);
}

runTests();

