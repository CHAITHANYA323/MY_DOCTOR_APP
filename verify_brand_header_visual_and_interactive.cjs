const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Lap12NOC\\.gemini\\antigravity\\brain\\5661bf7b-9fbc-4f30-a850-60a6cda0c0fd';
const OUT_DIR = path.resolve(__dirname, 'qa_reports', 'brand_header_audit');

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
      try { this.ws.close(); } catch (_) {}
    }
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async setViewport(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height
    });
  }

  async takeScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const localPath = path.join(OUT_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(artifactPath, buffer);
    console.log(`[CDP Screenshot] Saved: ${filename} (${buffer.length} bytes)`);
  }
}

async function loginAsRole(client, roleKey) {
  await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
  await sleep(1500);

  await client.eval(`
    (() => {
      localStorage.clear();
      sessionStorage.clear();
    })()
  `);
  await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
  await sleep(1500);

  const fillClicked = await client.eval(`
    (() => {
      const btn = document.querySelector('button[data-demo-role="${roleKey}"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log(`[Demo Fill] ${roleKey} clicked:`, fillClicked);
  await sleep(600);

  await client.eval(`
    (() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()
  `);
  await sleep(2500);
}

async function main() {
  console.log('Starting Chrome in remote debugging mode on port 9222...');
  const userDataDir = path.resolve(__dirname, 'qa_reports', 'chrome_brand_audit_profile');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'http://127.0.0.1:5173/login'
  ], { stdio: 'ignore' });

  await sleep(2500);

  try {
    const versionData = await getJson('http://127.0.0.1:9222/json/version');
    console.log('[CDP] Chrome Version:', versionData.Browser);

    const listData = await getJson('http://127.0.0.1:9222/json/list');
    const pageTarget = listData.find(t => t.type === 'page');
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('No page target with webSocketDebuggerUrl found');
    }

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    console.log('[CDP] Connected to Chrome DevTools Protocol!');

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('CSS.enable');

    const auditResults = {};

    // 1. Audit Public Brand Header on /login (English)
    console.log('\n--- 1. Auditing Public Navbar Brand Header on /login (English) ---');
    await client.setViewport(1280, 800, false);
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
    await sleep(1500);

    const navbarMetricsEn = await client.eval(`
      (() => {
        const brand = document.querySelector('.mediconnect-brand-root');
        const logoBadge = document.querySelector('.mediconnect-brand-logo-badge');
        const pulseRing = document.querySelector('.mediconnect-pulse-ring');
        const ecgSvg = document.querySelector('.mediconnect-ecg-svg');
        const ecgWave = document.querySelector('.mediconnect-ecg-wave');
        const tagline = document.querySelector('.mediconnect-rotating-tagline');
        const liveDot = document.querySelector('.mediconnect-live-dot');
        const header = document.querySelector('.navbar-header');

        return {
          brandFound: !!brand,
          logoBadgeFound: !!logoBadge,
          pulseRingFound: !!pulseRing,
          ecgSvgFound: !!ecgSvg,
          ecgWaveFound: !!ecgWave,
          taglineFound: !!tagline,
          currentTagline: tagline ? tagline.textContent.trim() : null,
          liveDotFound: !!liveDot,
          headerHeight: header ? header.getBoundingClientRect().height : null,
          isHeaderUnder68px: header ? header.getBoundingClientRect().height <= 68 : false
        };
      })()
    `);
    console.log('[Navbar Brand EN]:', navbarMetricsEn);
    auditResults.navbarEnglish = navbarMetricsEn;
    await client.takeScreenshot('brand_01_navbar_english.png');

    // Test Tagline Rotation after 3.8 seconds
    console.log('Waiting 3.8s to verify tagline rotation...');
    await sleep(3800);
    const rotatedTagline = await client.eval(`
      (() => {
        const tagline = document.querySelector('.mediconnect-rotating-tagline');
        return tagline ? tagline.textContent.trim() : null;
      })()
    `);
    console.log('[Rotated Tagline]:', rotatedTagline);
    auditResults.taglineRotated = {
      initial: navbarMetricsEn.currentTagline,
      after3800ms: rotatedTagline,
      didRotate: rotatedTagline !== navbarMetricsEn.currentTagline
    };
    await client.takeScreenshot('brand_02_navbar_tagline_rotated.png');

    // Test Telugu Language Switch
    console.log('\n--- 2. Auditing Telugu Language Switch ---');
    await client.eval(`
      (() => {
        const langToggle = document.querySelector('button[aria-label*="language" i]') ||
                           document.querySelector('button[title*="language" i]') ||
                           document.querySelector('button:has(.fa-globe)') ||
                           Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('తెలుగు') || b.textContent.includes('English'));
        if (langToggle) langToggle.click();
      })()
    `);
    await sleep(1000);
    const navbarTelugu = await client.eval(`
      (() => {
        const tagline = document.querySelector('.mediconnect-rotating-tagline');
        return {
          currentTagline: tagline ? tagline.textContent.trim() : null,
          lang: document.documentElement.lang
        };
      })()
    `);
    console.log('[Navbar Brand Telugu]:', navbarTelugu);
    auditResults.navbarTelugu = navbarTelugu;
    await client.takeScreenshot('brand_03_navbar_telugu.png');

    // Switch back to English
    await client.eval(`
      (() => {
        const langToggle = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('English') || b.textContent.includes('తెలుగు'));
        if (langToggle) langToggle.click();
      })()
    `);
    await sleep(500);

    // 3. Audit Welcome Landing Page Header
    console.log('\n--- 3. Auditing Welcome Landing Page Header ---');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
    await sleep(1500);
    const welcomeBrandMetrics = await client.eval(`
      (() => {
        const brand = document.querySelector('.mediconnect-brand-root');
        const ecgSvg = document.querySelector('.mediconnect-ecg-svg');
        const tagline = document.querySelector('.mediconnect-rotating-tagline');
        return {
          brandFound: !!brand,
          ecgFound: !!ecgSvg,
          tagline: tagline ? tagline.textContent.trim() : null
        };
      })()
    `);
    console.log('[Welcome Page Brand]:', welcomeBrandMetrics);
    auditResults.welcomePage = welcomeBrandMetrics;
    await client.takeScreenshot('brand_04_welcome_page.png');

    // 4. Audit Portals Brand Presence (All 6 Portals)
    const portals = [
      { role: 'HOSPITAL_ADMIN', name: 'Hospital Admin', file: 'brand_05_hospital_admin' },
      { role: 'PATIENT', name: 'Patient Portal', file: 'brand_06_patient' },
      { role: 'DOCTOR', name: 'Doctor Portal', file: 'brand_07_doctor' },
      { role: 'RECEPTIONIST', name: 'Receptionist Portal', file: 'brand_08_receptionist' },
      { role: 'HOSPITAL_SUPER_ADMIN', name: 'Super Admin', file: 'brand_09_superadmin' },
      { role: 'PLATFORM_OWNER', name: 'Platform Owner', file: 'brand_10_owner' }
    ];

    auditResults.portals = {};

    for (const portal of portals) {
      console.log(`\n--- Auditing Portal Brand: ${portal.name} ---`);
      await loginAsRole(client, portal.role);
      await sleep(1000);

      const portalMetrics = await client.eval(`
        (() => {
          const brand = document.querySelector('.mediconnect-brand-root');
          const logoBadge = document.querySelector('.mediconnect-brand-logo-badge');
          const pulseRing = document.querySelector('.mediconnect-pulse-ring');
          const ecgWave = document.querySelector('.mediconnect-ecg-wave');
          const tagline = document.querySelector('.mediconnect-rotating-tagline');

          return {
            brandFound: !!brand,
            logoBadgeFound: !!logoBadge,
            pulseRingFound: !!pulseRing,
            ecgWaveFound: !!ecgWave,
            subtitleText: tagline ? tagline.textContent.trim() : null
          };
        })()
      `);
      console.log(`[${portal.name} Brand Metrics]:`, portalMetrics);
      auditResults.portals[portal.name] = portalMetrics;
      await client.takeScreenshot(`${portal.file}_brand.png`);

      // Test Collapsed Sidebar
      await client.eval(`
        (() => {
          const toggle = document.querySelector('.sidebar-edge-toggle-btn') || 
                         document.querySelector('button[aria-label*="Collapse"]') || 
                         document.querySelector('button[title*="Collapse"]');
          if (toggle) toggle.click();
        })()
      `);
      await sleep(400);

      const collapsedBrandMetrics = await client.eval(`
        (() => {
          const brand = document.querySelector('.mediconnect-brand-root.is-collapsed');
          const badge = brand ? brand.querySelector('.mediconnect-brand-logo-badge') : null;
          return {
            collapsedBrandFound: !!brand,
            badgeRendered: !!badge,
            width: badge ? badge.getBoundingClientRect().width : null
          };
        })()
      `);
      console.log(`[${portal.name} Collapsed Brand]:`, collapsedBrandMetrics);
      auditResults.portals[`${portal.name}_collapsed`] = collapsedBrandMetrics;
      await client.takeScreenshot(`${portal.file}_collapsed_brand.png`);
    }

    // 5. Test Accessibility: Reduced Motion
    console.log('\n--- 5. Auditing Accessibility: prefers-reduced-motion ---');
    await client.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/login' });
    await sleep(1000);

    const reducedMotionMetrics = await client.eval(`
      (() => {
        const pulseRing = document.querySelector('.mediconnect-pulse-ring');
        const ecgWave = document.querySelector('.mediconnect-ecg-wave');
        const ringStyle = pulseRing ? window.getComputedStyle(pulseRing).animationName : null;
        const ecgStyle = ecgWave ? window.getComputedStyle(ecgWave).animationName : null;

        return {
          pulseRingAnimation: ringStyle,
          ecgWaveAnimation: ecgStyle,
          isMotionReduced: ringStyle === 'none' && ecgStyle === 'none'
        };
      })()
    `);
    console.log('[Reduced Motion Metrics]:', reducedMotionMetrics);
    auditResults.reducedMotion = reducedMotionMetrics;

    await client.close();

    console.log('\n========================================');
    console.log('AUDIT COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log(JSON.stringify(auditResults, null, 2));

    const reportPath = path.join(ARTIFACT_DIR, 'MEDICONNECT_BRAND_REDESIGN_AUDIT_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
    console.log(`Saved audit report to: ${reportPath}`);

  } catch (err) {
    console.error('Audit failed with error:', err);
    process.exitCode = 1;
  } finally {
    try {
      chromeProc.kill();
    } catch (_) {}
  }
}

main();
