const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
}

async function runTest() {
  console.log('[Test] Verifying Guest Access Redirects & Post-Login Return...');
  const userDir = path.resolve(__dirname, 'qa_reports', 'chrome_guest_test_' + Date.now());

  const chromeProc = spawn(CHROME_PATH, [
    '--remote-debugging-port=9450',
    `--user-data-dir=${userDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    'about:blank'
  ], { stdio: 'ignore' });

  let client = null;

  try {
    let connected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      try {
        await getJson('http://127.0.0.1:9450/json/version');
        connected = true;
        break;
      } catch (_) {}
    }
    if (!connected) throw new Error('Could not connect to Chrome port 9450');

    const targets = await getJson('http://127.0.0.1:9450/json');
    const pageTarget = targets.find(t => t.type === 'page');
    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // 1. Visit /doctors as unauthenticated guest
    console.log('\n[Step 1] Visiting /doctors as unauthenticated guest...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/doctors' });
    await sleep(2000);

    const docUrl = await client.eval(`window.location.href`);
    console.log('Current URL after /doctors:', docUrl);
    const redirectedToLogin = docUrl.includes('/login');
    console.log('Redirected to /login:', redirectedToLogin);

    // Check message on login page
    const loginMsg = await client.eval(`(() => {
      const banner = document.querySelector('.auth-card') || document.body;
      return banner.innerText.slice(0, 300);
    })()`);
    console.log('Login page context snippet:', loginMsg.replace(/\n+/g, ' '));

    // 2. Log in as Patient
    console.log('\n[Step 2] Logging in as Patient...');
    await client.eval(`
      const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelectorAll('input')[0];
      const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]') || document.querySelectorAll('input')[1];
      
      const setVal = (input, val) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      
      setVal(emailInput, 'patient.alpha@test.com');
      setVal(passInput, 'Patient@123');
    `);
    await sleep(400);

    // Submit
    await client.eval(`
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sign in') || b.innerText.toLowerCase().includes('log in'));
      if (btn) btn.click();
    `);
    await sleep(3000);

    // 3. Verify redirected to intended /doctors page!
    const postLoginUrl = await client.eval(`window.location.href`);
    console.log('\n[Step 3] URL after login:', postLoginUrl);
    const returnedToDoctors = postLoginUrl.includes('/doctors');
    console.log('Successfully redirected to intended /doctors page:', returnedToDoctors);

    // Check that doctor cards are loaded on /doctors
    const doctorCards = await client.eval(`document.querySelectorAll('.card').length`);
    console.log('Doctor cards rendered on /doctors:', doctorCards);

    // 4. Test /hospitals as logged-in user
    console.log('\n[Step 4] Visiting /hospitals as authenticated user...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/hospitals' });
    await sleep(2000);
    const hospUrl = await client.eval(`window.location.href`);
    console.log('URL on /hospitals:', hospUrl);

    // 5. Test /specializations as logged-in user
    console.log('\n[Step 5] Visiting /specializations as authenticated user...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/specializations' });
    await sleep(2000);
    const specUrl = await client.eval(`window.location.href`);
    console.log('URL on /specializations:', specUrl);

    console.log('\n[GUEST REDIRECT AUDIT RESULT]:', {
      redirectedToLogin,
      returnedToDoctors,
      doctorCardsCount: doctorCards,
      hospitalsAccessible: hospUrl.includes('/hospitals'),
      specialtiesAccessible: specUrl.includes('/specializations')
    });

  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    if (client) await client.close();
    chromeProc.kill('SIGKILL');
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (_) {}
  }
}

runTest();
