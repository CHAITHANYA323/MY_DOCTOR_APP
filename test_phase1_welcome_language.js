/**
 * MediConnect Phase 1: Automated Verification Test Suite
 * Tests Welcome Page, Bilingual Foundation, and Layout Integration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;
const frontendSrc = path.join(projectRoot, 'frontend', 'src');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

console.log('====================================================');
console.log('MEDICONNECT PHASE 1 VERIFICATION TEST SUITE');
console.log('====================================================\n');

// 1. Translations Dictionary Verification
console.log('1. TRANSLATION DICTIONARY (translations.js):');
const translationsPath = path.join(frontendSrc, 'i18n', 'translations.js');
assert(fs.existsSync(translationsPath), 'translations.js exists');

const translationsContent = fs.readFileSync(translationsPath, 'utf8');

// Verify exact user-mandated phrases in Telugu
assert(
  translationsContent.includes('WELCOME TO MEDICONNECT HEALTHCARE PLATFORM'),
  'Contains exact phrase: WELCOME TO MEDICONNECT HEALTHCARE PLATFORM'
);
assert(
  translationsContent.includes('మీ ఆరోగ్యం మా బాధ్యత'),
  'Contains exact phrase: మీ ఆరోగ్యం మా బాధ్యత'
);
assert(
  translationsContent.includes('డాక్టర్లను సులభంగా వెతకండి.'),
  'Contains exact phrase: డాక్టర్లను సులభంగా వెతకండి.'
);
assert(
  translationsContent.includes('ఆసుపత్రుల వివరాలు తెలుసుకోండి.'),
  'Contains exact phrase: ఆసుపత్రుల వివరాలు తెలుసుకోండి.'
);
assert(
  translationsContent.includes('డాక్టర్ అపాయింట్మెంట్ బుక్ చేసుకోండి.'),
  'Contains exact phrase: డాక్టర్ అపాయింట్మెంట్ బుక్ చేసుకోండి.'
);
assert(
  translationsContent.includes('మీ ఆరోగ్య వివరాలను చూసుకోండి.'),
  'Contains exact phrase: మీ ఆరోగ్య వివరాలను చూసుకోండి.'
);
assert(
  translationsContent.includes('ప్రారంభించండి / Get Started'),
  'Contains exact phrase: ప్రారంభించండి / Get Started'
);

// Verify English equivalents exist
assert(translationsContent.includes('Find Doctors Easily.'), 'English translation for item 1 exists');
assert(translationsContent.includes('Explore Hospital Details.'), 'English translation for item 2 exists');
assert(translationsContent.includes('Book Doctor Appointments.'), 'English translation for item 3 exists');
assert(translationsContent.includes('View Your Health Records.'), 'English translation for item 4 exists');

// 2. Language Context Verification
console.log('\n2. LANGUAGE CONTEXT (LanguageContext.jsx):');
const contextPath = path.join(frontendSrc, 'context', 'LanguageContext.jsx');
assert(fs.existsSync(contextPath), 'LanguageContext.jsx exists');
const contextContent = fs.readFileSync(contextPath, 'utf8');

assert(contextContent.includes("DEFAULT_LANGUAGE = 'te'"), "Default language set to 'te' (Telugu)");
assert(contextContent.includes("STORAGE_KEY = 'mediconnect_lang'"), "Storage key set to 'mediconnect_lang'");
assert(contextContent.includes('localStorage.getItem(STORAGE_KEY)'), 'Reads from localStorage');
assert(contextContent.includes('localStorage.setItem(STORAGE_KEY, language)'), 'Persists to localStorage');
assert(contextContent.includes('document.documentElement.lang = language'), 'Synchronizes HTML document lang attribute');
assert(contextContent.includes('useLanguage'), 'Exports useLanguage custom hook');

// 3. Language Toggle Component
console.log('\n3. REUSABLE LANGUAGE TOGGLE (LanguageToggle.jsx):');
const togglePath = path.join(frontendSrc, 'components', 'common', 'LanguageToggle.jsx');
assert(fs.existsSync(togglePath), 'LanguageToggle.jsx exists');
const toggleContent = fs.readFileSync(togglePath, 'utf8');

assert(toggleContent.includes("setLanguage('te')"), "Includes trigger for Telugu ('te')");
assert(toggleContent.includes("setLanguage('en')"), "Includes trigger for English ('en')");
assert(toggleContent.includes('తెలుగు'), "Renders label 'తెలుగు'");
assert(toggleContent.includes('English'), "Renders label 'English'");
assert(toggleContent.includes('aria-label'), 'Includes accessibility attributes');

// 4. Welcome Page Verification
console.log('\n4. WELCOME PAGE (Welcome.jsx):');
const welcomePath = path.join(frontendSrc, 'pages', 'Welcome.jsx');
assert(fs.existsSync(welcomePath), 'Welcome.jsx exists');
const welcomeContent = fs.readFileSync(welcomePath, 'utf8');

assert(
  welcomeContent.includes('WELCOME TO MEDICONNECT HEALTHCARE PLATFORM'),
  'Welcome page displays: WELCOME TO MEDICONNECT HEALTHCARE PLATFORM'
);
assert(
  welcomeContent.includes('మీ ఆరోగ్యం మా బాధ్యత'),
  'Welcome page displays: మీ ఆరోగ్యం మా బాధ్యత'
);
assert(
  welcomeContent.includes('డాక్టర్లను సులభంగా వెతకండి.'),
  'Welcome page card displays: డాక్టర్లను సులభంగా వెతకండి.'
);
assert(
  welcomeContent.includes('ఆసుపత్రుల వివరాలు తెలుసుకోండి.'),
  'Welcome page card displays: ఆసుపత్రుల వివరాలు తెలుసుకోండి.'
);
assert(
  welcomeContent.includes('డాక్టర్ అపాయింట్మెంట్ బుక్ చేసుకోండి.'),
  'Welcome page card displays: డాక్టర్ అపాయింట్మెంట్ బుక్ చేసుకోండి.'
);
assert(
  welcomeContent.includes('మీ ఆరోగ్య వివరాలను చూసుకోండి.'),
  'Welcome page card displays: మీ ఆరోగ్య వివరాలను చూసుకోండి.'
);
assert(
  welcomeContent.includes('ప్రారంభించండి / Get Started'),
  'Welcome page prominent button: ప్రారంభించండి / Get Started'
);
assert(
  welcomeContent.includes("navigate('/login')"),
  'Button navigates directly to existing /login route'
);
assert(
  welcomeContent.includes('LanguageToggle'),
  'Welcome page integrates LanguageToggle directly'
);
assert(
  welcomeContent.includes('/doctors') && welcomeContent.includes('/hospitals'),
  'Links genuinely existing application services only'
);

// 5. Main DOM & App Routing Verification
console.log('\n5. MAIN ENTRY & APP ROUTING (main.jsx, App.jsx):');
const mainPath = path.join(frontendSrc, 'main.jsx');
const mainContent = fs.readFileSync(mainPath, 'utf8');
assert(mainContent.includes('<LanguageProvider>'), 'main.jsx wraps application in <LanguageProvider>');

const appPath = path.join(frontendSrc, 'App.jsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes('<Route path="/" element={<Welcome />} />'), 'Root route "/" serves Welcome page');
assert(appContent.includes('<Route path="/welcome" element={<Welcome />} />'), 'Route "/welcome" serves Welcome page');
assert(appContent.includes('<Route path="/home" element={<Home />} />'), 'Route "/home" preserves existing Home page');
assert(appContent.includes('<Route path="/login" element={<Login />} />'), 'Route "/login" preserved');
assert(appContent.includes('<Route path="/register" element={<Register />} />'), 'Route "/register" preserved');
assert(appContent.includes('isWelcomeRoute'), 'Standalone Welcome route prevents navbar duplication');

// 6. Typography & Styling Verification
console.log('\n6. TYPOGRAPHY & FONT SETUP (index.html, index.css):');
const htmlPath = path.join(projectRoot, 'frontend', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
assert(htmlContent.includes('Noto+Sans+Telugu'), 'index.html links Google Font Noto Sans Telugu');
assert(htmlContent.includes('<html lang="te">'), 'index.html defaults lang attribute to "te"');

const cssPath = path.join(frontendSrc, 'index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('--font-telugu'), 'index.css defines --font-telugu CSS token');
assert(cssContent.includes('html[lang="te"]'), 'index.css sets line-height & font for Telugu');

// 7. Language Switcher Presence Across All Six Portal Layouts + Public Pages
console.log('\n7. LANGUAGE SWITCHER INTEGRATION AUDIT:');
const portalsToTest = [
  { name: 'Public Navbar', path: 'components/Navbar.jsx' },
  { name: 'Login Page', path: 'pages/Login.jsx' },
  { name: 'Register Page', path: 'pages/Register.jsx' },
  { name: '1. Patient Portal', path: 'pages/patient/PatientLayout.jsx' },
  { name: '2. Doctor Portal', path: 'pages/doctor/DoctorLayout.jsx' },
  { name: '3. Hospital Admin Portal', path: 'pages/admin/AdminLayout.jsx' },
  { name: '4. Receptionist Portal', path: 'pages/admin/ReceptionLayout.jsx' },
  { name: '5. Super Admin Portal', path: 'pages/superadmin/SuperAdminLayout.jsx' },
  { name: '6. Platform Owner Portal', path: 'pages/owner/OwnerLayout.jsx' },
];

for (const portal of portalsToTest) {
  const filePath = path.join(frontendSrc, portal.path);
  const content = fs.readFileSync(filePath, 'utf8');
  const hasToggle = content.includes('LanguageToggle');
  assert(hasToggle, `${portal.name} includes LanguageToggle`);
}

// 8. Safety & Non-Regression Verification
console.log('\n8. SAFETY & NON-REGRESSION CHECKS:');
// Ensure database files were not modified
const sqliteStat = fs.statSync(path.join(projectRoot, 'backend', 'doctor_hospital.db'));
assert(sqliteStat.size === 253952, `Original SQLite DB size intact (253,952 bytes)`);

// Check that timestamped backup exists
const backupsDir = path.join(projectRoot, 'backups');
assert(fs.existsSync(backupsDir), 'Backups directory exists');
const backupFolders = fs.readdirSync(backupsDir).filter(f => f.startsWith('frontend_source_backup_'));
assert(backupFolders.length > 0, `Timestamped frontend backup exists: ${backupFolders[backupFolders.length - 1]}`);

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
}

