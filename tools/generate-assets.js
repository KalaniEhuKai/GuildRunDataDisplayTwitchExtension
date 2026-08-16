/**
 * =============================================================================
 * Twitch Extension Asset Generator (tools/generate-assets.js)
 * Generates Twitch Developer Console extension icons (Logo, Taskbar, Discovery)
 * Design: Black background with light blue-green "GR" text.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function createSvg(width, height, fontSize) {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#000000"/>
      <text
        x="50%"
        y="54%"
        dominant-baseline="central"
        text-anchor="middle"
        fill="#2dd4bf"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="900"
        font-size="${fontSize}px"
        letter-spacing="-0.02em"
      >GR</text>
    </svg>
  `;
}

async function generateAssets() {
  console.log('[Assets] Generating Twitch Extension images...');

  // 1. Logo (100 x 100 px)
  const logoSvg = Buffer.from(createSvg(100, 100, 52));
  const logoPath = path.join(ASSETS_DIR, 'logo_100x100.png');
  await sharp(logoSvg).png().toFile(logoPath);
  console.log(`[Assets] Created ${logoPath} (100x100)`);

  // 2. Taskbar (24 x 24 px)
  const taskbarSvg = Buffer.from(createSvg(24, 24, 13));
  const taskbarPath = path.join(ASSETS_DIR, 'taskbar_24x24.png');
  await sharp(taskbarSvg).png().toFile(taskbarPath);
  console.log(`[Assets] Created ${taskbarPath} (24x24)`);

  // 3. Discovery (300 x 200 px)
  const discoverySvg = Buffer.from(createSvg(300, 200, 110));
  const discoveryPath = path.join(ASSETS_DIR, 'discovery_300x200.png');
  await sharp(discoverySvg).png().toFile(discoveryPath);
  console.log(`[Assets] Created ${discoveryPath} (300x200)`);

  console.log('[Assets] All extension images generated successfully!');
}

generateAssets().catch((err) => {
  console.error('[Assets] Error generating assets:', err);
  process.exit(1);
});
