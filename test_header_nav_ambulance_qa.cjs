const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Lap12NOC\\.gemini\\antigravity\\brain\\5661bf7b-9fbc-4f30-a850-60a6cda0c0fd';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Evaluation exception: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768
    });
    await this.send('Emulation.setVisibleSize', { width, height });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}

async function runQA() {
  console.log('--- STARTING MEDICONNECT HEADER, NAV BLINK FIX & AMBULANCE 108 VERIFICATION ---');
  const results = {
    headerRedesign: {},
    navBlinkFix: {},
    ambulance108: {},
    responsive: {},
    languageSupport: {}
  };

  const port = 9345;
  const userDataDir = path.resolve(__dirname, 'qa_chrome_nav_fix_profile_3');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu',
    'about:blank'
  ]);

  let cdp = null;

  try {
    let versionInfo = null;
    for (let i = 0; i < 20; i++) {
      try {
        versionInfo = await getJson(`http://127.0.0.1:${port}/json/version`);
        break;
      } catch (e) {
        await sleep(400);
      }
    }

    if (!versionInfo) throw new Error('Failed to attach to Chrome');

    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // 1. Visit Home Page (1440x900)
    console.log('[1/5] Visiting Home Page (1440x900)...');
    await cdp.setViewport(1440, 900);
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/home' });
    await sleep(2000);

    // Verify Header Branding
    const brandInfo = await cdp.evaluate(`(() => {
      const brand = document.querySelector('.mediconnect-brand-root');
      const pulseWave = document.querySelector('.mediconnect-ecg-wave');
      const pulseRing = document.querySelector('.mediconnect-pulse-ring');
      const tagline = document.querySelector('.mediconnect-rotating-tagline');
      return {
        brandFound: !!brand,
        pulseWaveFound: !!pulseWave,
        pulseRingFound: !!pulseRing,
        taglineFound: !!tagline,
        taglineText: tagline ? tagline.innerText.trim() : null
      };
    })()`);
    results.headerRedesign = brandInfo;
    console.log('Header Brand status:', brandInfo);

    // Verify Ambulance 108 Emergency Badge
    const ambBadge = await cdp.evaluate(`(() => {
      const badge = document.querySelector('.navbar-emergency-badge');
      const beaconDot = document.querySelector('.ambulance-beacon-dot');
      const beaconRing = document.querySelector('.ambulance-beacon-ring');
      if (!badge) return { found: false };
      const style = window.getComputedStyle(badge);
      return {
        found: true,
        text: badge.innerText.trim(),
        href: badge.getAttribute('href'),
        title: badge.getAttribute('title'),
        ariaLabel: badge.getAttribute('aria-label'),
        bg: style.backgroundImage || style.backgroundColor,
        color: style.color,
        beaconFound: !!beaconDot && !!beaconRing
      };
    })()`);
    results.ambulance108 = ambBadge;
    console.log('Ambulance 108 Badge:', ambBadge);

    await cdp.screenshot(path.join(ARTIFACT_DIR, 'navfix_01_home_header_ambulance108.png'));

    // 2. Test Navigation Links: Doctors, Hospitals, Specialities
    console.log('[2/5] Testing Navigation Links: Doctors, Hospitals, Specialities...');

    // Click Doctors Link
    console.log('Navigating to Doctors (/doctors)...');
    await cdp.evaluate(`(() => {
      const link = document.querySelector('.desktop-nav a[href="/doctors"]');
      if (link) link.click();
    })()`);
    await sleep(2000);

    const docNav = await cdp.evaluate(`(() => {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        isLoginPage: window.location.pathname === '/login',
        title: document.title,
        heading: document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : null,
        navbarPresent: !!document.querySelector('.navbar-header'),
        footerPresent: !!document.querySelector('.footer'),
        doctorCardsCount: document.querySelectorAll('.card').length
      };
    })()`);
    results.navBlinkFix.doctors = docNav;
    console.log('Navigation to Doctors:', docNav);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'navfix_02_doctors_page.png'));

    // Click Hospitals Link from Doctors Page
    console.log('Navigating to Hospitals (/hospitals)...');
    await cdp.evaluate(`(() => {
      const link = document.querySelector('.desktop-nav a[href="/hospitals"]');
      if (link) link.click();
    })()`);
    await sleep(2000);

    const hospNav = await cdp.evaluate(`(() => {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        isLoginPage: window.location.pathname === '/login',
        heading: document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : null,
        navbarPresent: !!document.querySelector('.navbar-header'),
        hospitalCardsCount: document.querySelectorAll('.card').length
      };
    })()`);
    results.navBlinkFix.hospitals = hospNav;
    console.log('Navigation to Hospitals:', hospNav);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'navfix_03_hospitals_page.png'));

    // Click Specialities Link from Hospitals Page
    console.log('Navigating to Specialities (/specializations)...');
    await cdp.evaluate(`(() => {
      const link = document.querySelector('.desktop-nav a[href="/specializations"]');
      if (link) link.click();
    })()`);
    await sleep(2000);

    const specNav = await cdp.evaluate(`(() => {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        isLoginPage: window.location.pathname === '/login',
        heading: document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : null,
        navbarPresent: !!document.querySelector('.navbar-header'),
        categoriesCount: document.querySelectorAll('.card').length
      };
    })()`);
    results.navBlinkFix.specializations = specNav;
    console.log('Navigation to Specialities:', specNav);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'navfix_04_specialties_page.png'));

    // 3. Test Clicking Ambulance 108 Emergency Badge
    console.log('[3/5] Testing Ambulance 108 Emergency Badge Click...');
    await cdp.evaluate(`(() => {
      const badge = document.querySelector('.navbar-emergency-badge');
      if (badge) badge.click();
    })()`);
    await sleep(2000);

    const ambPage = await cdp.evaluate(`(() => {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        heading: document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : null,
        call108Btns: Array.from(document.querySelectorAll('a[href="tel:108"]')).map(a => a.innerText.trim())
      };
    })()`);
    results.ambulance108.destination = ambPage;
    console.log('Ambulance 108 Destination:', ambPage);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'navfix_05_ambulance_screen.png'));

    // 4. Test English & Telugu Language Switching
    console.log('[4/5] Testing English and Telugu Language Switch on Header & Ambulance 108...');
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/home' });
    await sleep(1500);

    // Switch to English
    await cdp.evaluate(`(() => {
      const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('English'));
      if (enBtn) enBtn.click();
    })()`);
    await sleep(1000);

    const englishState = await cdp.evaluate(`(() => {
      const badge = document.querySelector('.navbar-emergency-badge');
      const tagline = document.querySelector('.mediconnect-rotating-tagline');
      return {
        badgeText: badge ? badge.innerText.trim() : null,
        taglineText: tagline ? tagline.innerText.trim() : null
      };
    })()`);
    results.languageSupport.english = englishState;
    console.log('English State:', englishState);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'navfix_06_english_header_ambulance108.png'));

    // Switch to Telugu
    await cdp.evaluate(`(() => {
      const teBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('తెలుగు'));
      if (teBtn) teBtn.click();
    })()`);
    await sleep(1000);

    const teluguState = await cdp.evaluate(`(() => {
      const badge = document.querySelector('.navbar-emergency-badge');
      const tagline = document.querySelector('.mediconnect-rotating-tagline');
      return {
        badgeText: badge ? badge.innerText.trim() : null,
        taglineText: tagline ? tagline.innerText.trim() : null
      };
    })()`);
    results.languageSupport.telugu = teluguState;
    console.log('Telugu State:', teluguState);
    await cdp.screenshot(path.join(ARTIFACT_DIR, 'navfix_06_telugu_header_ambulance108.png'));

    // 5. Test Responsive Viewports
    console.log('[5/5] Testing Responsive Viewports (375px, 390px, 768px, 1024px, 1440px)...');
    const viewports = [
      { name: 'mobile_375', width: 375, height: 667 },
      { name: 'mobile_390', width: 390, height: 844 },
      { name: 'tablet_768', width: 768, height: 1024 },
      { name: 'desktop_1024', width: 1024, height: 768 },
      { name: 'desktop_1440', width: 1440, height: 900 }
    ];

    for (const vp of viewports) {
      await cdp.setViewport(vp.width, vp.height);
      await cdp.send('Page.navigate', { url: 'http://127.0.0.1:5173/home' });
      await sleep(1200);

      const check = await cdp.evaluate(`(() => {
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          scrollWidth: document.documentElement.scrollWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          badgeVisible: (() => {
            const b = document.querySelector('.navbar-emergency-badge');
            if (!b) return false;
            const r = b.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          })()
        };
      })()`);
      results.responsive[vp.name] = check;
      console.log(`Viewport ${vp.name}: overflow=${check.hasHorizontalOverflow}, scrollWidth=${check.scrollWidth}`);
      await cdp.screenshot(path.join(ARTIFACT_DIR, `navfix_07_responsive_${vp.name}.png`));
    }

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'MEDICONNECT_HEADER_NAV_AMBULANCE_QA_RESULTS.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('QA Verification Completed Successfully!');
  } catch (err) {
    console.error('QA Execution Error:', err);
    process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill('SIGKILL');
  }
}

runQA();
