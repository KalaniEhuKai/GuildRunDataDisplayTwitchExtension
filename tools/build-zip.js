/**
 * =============================================================================
 * Twitch Extension Zip Package Builder (tools/build-zip.js)
 * Packages required Twitch Extension files into extension.zip for console upload.
 * =============================================================================
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_ZIP = path.join(PROJECT_ROOT, 'extension.zip');

// Files required for Twitch Extension package upload
const REQUIRED_FILES = [
  'overlay.html',
  'overlay.js',
  'style.css',
  'guildrundatabase.js',
  'config.html',
  'config.js',
  'manifest.json'
];

function createZipPackage() {
  console.log('[Build] Packaging Twitch Extension files into extension.zip...');

  if (fs.existsSync(OUTPUT_ZIP)) {
    fs.unlinkSync(OUTPUT_ZIP);
  }

  const missing = REQUIRED_FILES.filter(f => !fs.existsSync(path.join(PROJECT_ROOT, f)));
  if (missing.length > 0) {
    console.warn(`[Build] Warning: Missing files: ${missing.join(', ')}`);
  }

  const filesToZip = REQUIRED_FILES.filter(f => fs.existsSync(path.join(PROJECT_ROOT, f)));
  const filesList = filesToZip.map(f => `'${f}'`).join(', ');

  const psCmd = `powershell -Command "Compress-Archive -Path ${filesList} -DestinationPath 'extension.zip' -Force"`;

  execSync(psCmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  if (fs.existsSync(OUTPUT_ZIP)) {
    const stat = fs.statSync(OUTPUT_ZIP);
    const sizeKb = (stat.size / 1024).toFixed(2);
    console.log(`[Build] Successfully created extension.zip (${sizeKb} KB)`);
    console.log('[Build] Contents: ' + filesToZip.join(', '));
    console.log('[Build] Ready to upload to Twitch Developer Console!');
  } else {
    throw new Error('Failed to create extension.zip');
  }
}

try {
  createZipPackage();
} catch (err) {
  console.error('[Build] Error creating zip package:', err.message);
  process.exit(1);
}
