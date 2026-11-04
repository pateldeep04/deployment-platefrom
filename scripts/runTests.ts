import fs from 'fs';
import path from 'path';
import { MalwareScanner } from '../server/services/malwareScanner';
import { SecurityValidator, ALLOWED_STATIC_EXTENSIONS } from '../server/middleware/securityValidator';
import { config } from '../server/config';

let passed = 0;
let total = 0;

function assert(condition: any, testName: string) {
  total++;
  if (Boolean(condition)) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n========================================');
  console.log('🧪 DeployHub Automated CI Test Suite');
  console.log('========================================\n');

  // ----------------------------------------------------
  // Suite 1: File Signature & Magic Byte Verification
  // ----------------------------------------------------
  console.log('▶ Suite 1: Security File Signatures & Webshell Polyglot Defense');

  // 1. Valid PNG
  const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  const resPng = MalwareScanner.verifyFileSignature(validPng, 'image.png');
  assert(resPng.valid === true, 'Valid PNG header accepted');

  // 2. Disguised executable as PNG (Windows PE / MZ header)
  const exeAsPng = Buffer.concat([Buffer.from([0x4D, 0x5A, 0x90, 0x00]), Buffer.alloc(32)]);
  const resExePng = MalwareScanner.verifyFileSignature(exeAsPng, 'fake.png');
  assert(resExePng.valid === false && resExePng.reason?.includes('executable'), 'Disguised EXE as PNG rejected');

  // 3. Disguised Linux ELF binary as JPEG
  const elfAsJpg = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
  const resElfJpg = MalwareScanner.verifyFileSignature(elfAsJpg, 'avatar.jpg');
  assert(resElfJpg.valid === false && resElfJpg.reason?.includes('executable'), 'Disguised ELF as JPEG rejected');

  // 4. Valid ZIP header
  const validZip = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
  assert(MalwareScanner.isValidZipHeader(validZip) === true, 'Standard ZIP PK header accepted');

  // 5. Spoofed ZIP (RAR / TAR disguised as ZIP)
  const fakeZip = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]);
  assert(MalwareScanner.isValidZipHeader(fakeZip) === false, 'Non-ZIP header rejected by isValidZipHeader');

  // 6. SVG Script injection attack
  const maliciousSvg = Buffer.from(['<svg><', 's', 'c', 'r', 'i', 'p', 't>alert(1)</', 'script></svg>'].join(''));
  const resBadSvg = MalwareScanner.verifyFileSignature(maliciousSvg, 'logo.svg');
  assert(resBadSvg.valid === false && resBadSvg.reason?.includes('script'), 'SVG with script tags rejected');

  // 7. Clean SVG
  const cleanSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>');
  const resCleanSvg = MalwareScanner.verifyFileSignature(cleanSvg, 'logo.svg');
  assert(resCleanSvg.valid === true, 'Clean SVG vector image accepted');

  // 8. Webshell Polyglot in HTML
  const polyHtml = Buffer.from(['<!DOCTYPE html><html><body><', '?', 'p', 'h', 'p', ' echo 1; ?></body></html>'].join(''));
  const resPoly = MalwareScanner.verifyFileSignature(polyHtml, 'index.html');
  assert(resPoly.valid === false && resPoly.reason?.includes('Webshell Polyglot'), 'Webshell polyglot inside HTML rejected');

  // ----------------------------------------------------
  // Suite 2: Extension Filtering Rules
  // ----------------------------------------------------
  console.log('\n▶ Suite 2: Extension Security Rules');
  assert(ALLOWED_STATIC_EXTENSIONS.has('.html'), 'HTML in allowed static extensions');
  assert(ALLOWED_STATIC_EXTENSIONS.has('.js'), 'JavaScript in allowed static extensions');
  assert(ALLOWED_STATIC_EXTENSIONS.has('.css'), 'CSS in allowed static extensions');
  assert(!ALLOWED_STATIC_EXTENSIONS.has('.exe'), '.exe strictly excluded');
  assert(!ALLOWED_STATIC_EXTENSIONS.has('.bat'), '.bat strictly excluded');
  assert(!ALLOWED_STATIC_EXTENSIONS.has('.sh'), '.sh strictly excluded');
  assert(!ALLOWED_STATIC_EXTENSIONS.has('.rar'), '.rar archive format excluded');

  // ----------------------------------------------------
  // Suite 3: Configuration & Storage Sanity
  // ----------------------------------------------------
  console.log('\n▶ Suite 3: Platform Configuration & Storage Layout');
  assert(typeof config.port === 'number' && config.port > 0, `Server port valid (${config.port})`);
  assert(typeof config.storageDir === 'string', 'Storage directory defined in config');
  assert(typeof config.uploadMaxSizeMb === 'number' && config.uploadMaxSizeMb >= 10, 'Max upload size defined and sane');

  // ----------------------------------------------------
  // Suite 4: Database State & Backup Sanity
  // ----------------------------------------------------
  console.log('\n▶ Suite 4: State Store Integrity');
  const stateFile = path.join(config.storageDir, 'data', 'deployhub_state.json');
  if (fs.existsSync(stateFile)) {
    try {
      const raw = fs.readFileSync(stateFile, 'utf-8');
      const data = JSON.parse(raw);
      assert(Array.isArray(data.users), 'Users collection is an array');
      assert(Array.isArray(data.projects), 'Projects collection is an array');
      assert(typeof data.settings === 'object', 'Settings configuration is an object');
    } catch (e: any) {
      assert(false, `State file JSON valid: ${e.message}`);
    }
  } else {
    console.log('  ℹ️ Note: State file not created yet in current environment, skipping state JSON verification.');
  }

  // ----------------------------------------------------
  // Summary & Exit
  // ----------------------------------------------------
  console.log('\n========================================');
  console.log(`🏁 Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================\n');

  if (passed !== total) {
    console.error(`💥 Automated test suite failed: ${total - passed} assertion(s) failed.`);
    process.exit(1);
  } else {
    console.log('🎉 All automated test cases passed successfully!');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
