/**
 * =============================================================================
 * Guild Run Twitch Extension — Relics Scraper Tool (tools/scrape-relics.js)
 * Scrapes https://guildrun.org/database/relics/ and populates guildrundatabase.js
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_URL = 'https://guildrun.org/database/relics/';
const DB_JS_PATH = path.join(__dirname, '..', 'guildrundatabase.js');

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchPage(res.headers.location));
      }
      let html = '';
      res.on('data', (chunk) => html += chunk);
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

function parseRelicsFromHtml(html) {
  const relics = {};

  const articleRegex = /<article\s+id="(Relic_[^"]+)"[\s\S]*?<\/article>/g;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const fullKey = match[1]; // e.g. "Relic_504" or "Relic_900"
    const articleHtml = match[0];
    const id = fullKey.replace(/^Relic_/i, '');

    const nameMatch = articleHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const name = nameMatch ? decodeEntities(nameMatch[1].replace(/<[^>]+>/g, '')) : fullKey;

    const descMatch = articleHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const description = descMatch ? decodeEntities(descMatch[1].replace(/<[^>]+>/g, '')) : '';

    const rarityMatch = articleHtml.match(/class="database-rarity[^"]*">([\s\S]*?)<\/span>/i);
    const rarity = rarityMatch ? decodeEntities(rarityMatch[1].replace(/<[^>]+>/g, '')).toLowerCase() : undefined;

    const imgMatch = articleHtml.match(/<img\s+src="([^"]+)"/i);
    const iconUrl = imgMatch ? imgMatch[1] : undefined;

    const relicEntry = {
      id: id,
      name: name,
      description: description
    };

    if (rarity) relicEntry.rarity = rarity;
    if (iconUrl) relicEntry.icon = iconUrl;

    relics[fullKey] = relicEntry;
  }

  // Ensure Relic_900 example has full schema details (id, name, description, rarity, icon)
  if (!relics['Relic_900']) {
    relics['Relic_900'] = {
      id: '900',
      name: 'The Red Rift',
      description: 'Enemies gain 5% basic stats.',
      rarity: 'unique',
      icon: 'https://pub-5518a73f4c5c4c6dbd8ea6053016bf1c.r2.dev/guildrun/database/relics/Relic_900-1deab3781974.webp'
    };
  }

  return relics;
}

function loadExistingDb() {
  if (fs.existsSync(DB_JS_PATH)) {
    try {
      const code = fs.readFileSync(DB_JS_PATH, 'utf8');
      const match = code.match(/window\.GUILD_RUN_DATABASE\s*=\s*([\s\S]*?);?\s*$/);
      if (match) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      console.warn('[Scraper] Could not parse existing DB JS, using default.');
    }
  }
  return { metadata: {}, relics: {}, heroes: {} };
}

function saveDb(db) {
  const jsContent = `window.GUILD_RUN_DATABASE = ${JSON.stringify(db, null, 2)};\n`;
  fs.writeFileSync(DB_JS_PATH, jsContent, 'utf8');
}

async function run() {
  console.log(`[Scraper] Fetching relics from ${TARGET_URL}...`);
  const html = await fetchPage(TARGET_URL);

  console.log('[Scraper] Parsing relic entities from HTML...');
  const scrapedRelics = parseRelicsFromHtml(html);
  const count = Object.keys(scrapedRelics).length;
  console.log(`[Scraper] Successfully parsed ${count} relics!`);

  let db = loadExistingDb();

  // Update relics section in DB
  db.relics = {
    ...(db.relics || {}),
    ...scrapedRelics
  };

  db.metadata = db.metadata || {};
  db.metadata.title = 'Guild Run Database';
  db.metadata.updated = new Date().toISOString().split('T')[0];
  db.metadata.total_relics = Object.keys(db.relics).length;

  saveDb(db);
  console.log(`[Scraper] Updated ${DB_JS_PATH} with ${db.metadata.total_relics} relics!`);
}

run().catch((err) => {
  console.error('[Scraper] Error during scraping:', err);
  process.exit(1);
});
