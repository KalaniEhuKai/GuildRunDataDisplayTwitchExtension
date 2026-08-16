/**
 * =============================================================================
 * Twitch Extension — Video Overlay Controller (overlay.js)
 * =============================================================================
 */

const WORKER_URL = 'https://twitch-local-game-data-bridge.kalani-ehu-kai.workers.dev';
const POLL_INTERVAL_MS = 3000;

// State management
const state = {
  channelId: null,
  pollTimer: null,
  isDrawerOpen: false,
  lastPayloadStr: null,
};

const $ = (id) => document.getElementById(id);

function initOverlay() {
  // Listen for Twitch Extension authorization helper
  if (window.Twitch && window.Twitch.ext) {
    window.Twitch.ext.onAuthorized((auth) => {
      state.channelId = auth.channelId;
      startPolling();
    });
  }

  // Fallback for standalone browser testing: check ?channelId=... in URL query string
  const params = new URLSearchParams(window.location.search);
  const queryChannelId = params.get('channelId') || params.get('cid');
  if (queryChannelId && !state.channelId) {
    state.channelId = queryChannelId;
    startPolling();
  }

  // Toggle drawer click handlers
  $('pill-btn')?.addEventListener('click', toggleDrawer);
  $('close-drawer-btn')?.addEventListener('click', closeDrawer);
}

function toggleDrawer() {
  state.isDrawerOpen = !state.isDrawerOpen;
  const drawer = $('overlay-drawer');
  if (drawer) {
    if (state.isDrawerOpen) drawer.classList.remove('hidden');
    else drawer.classList.add('hidden');
  }
}

function closeDrawer() {
  state.isDrawerOpen = false;
  $('overlay-drawer')?.classList.add('hidden');
}

function startPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  fetchLiveGameData();
  state.pollTimer = setInterval(fetchLiveGameData, POLL_INTERVAL_MS);
}

async function fetchLiveGameData() {
  if (!state.channelId) return;

  try {
    const url = `${WORKER_URL}/data/${encodeURIComponent(state.channelId)}/guild-run/data`;
    const res = await fetch(url);

    if (res.status === 404) {
      renderNoRunState('No data uploaded yet');
      return;
    }

    if (!res.ok) {
      renderOfflineState();
      return;
    }

    const payloadText = await res.text();
    if (payloadText === state.lastPayloadStr) return; // Skip DOM re-render if unchanged
    state.lastPayloadStr = payloadText;

    let data;
    try {
      data = JSON.parse(payloadText);
    } catch {
      renderOfflineState();
      return;
    }

    // Check if streamer has no active run file
    if (data.status === 'no_file_found') {
      renderNoRunState('No active run');
      return;
    }

    renderActiveRunState(data);
  } catch (err) {
    console.warn('[TwitchExt] Polling error:', err);
    renderOfflineState();
  }
}

function renderNoRunState(subMsg = 'No active run') {
  const dot = $('pill-status-dot');
  if (dot) {
    dot.className = 'pill-dot offline';
  }
  $('pill-title-text').textContent = 'Guild Run';
  $('pill-sub-text').textContent = subMsg;

  $('active-run-view').hidden = true;
  $('no-run-view').hidden = false;
}

function renderOfflineState() {
  renderNoRunState('Offline');
}

function renderActiveRunState(data) {
  // Update Pill Badge
  const dot = $('pill-status-dot');
  if (dot) {
    dot.className = 'pill-dot'; // active green dot
  }

  const act = data.RunSessionDto?.Act || data.Act || 1;
  const floor = data.RunSessionDto?.Floor || data.Floor || 1;
  const shards = data.PlayerDataDto?.Shards || data.Shards || 0;
  const seed = data.RunSessionDto?.Seed || data.Seed || '—';

  $('pill-title-text').textContent = `Act ${act} · Floor ${floor}`;
  $('pill-sub-text').textContent = `💎 ${shards} Shards`;

  // Show active view, hide no-run view
  $('active-run-view').hidden = false;
  $('no-run-view').hidden = true;

  // Update Stats Box
  $('val-act').textContent = act;
  $('val-floor').textContent = floor;
  $('val-gold').textContent = shards;
  $('val-seed').textContent = seed;

  // Render Relics
  const relicsMap = data.PlayerDataDto?.ActiveRelics || data.ActiveRelics || {};
  renderRelics(relicsMap);

  // Render Heroes / Party
  const heroesMap = data.GameRegistryDto?.Heroes || data.Heroes || {};
  renderHeroes(heroesMap);
}

function renderRelics(relicsMap) {
  const container = $('relics-list');
  if (!container) return;

  const entries = Object.entries(relicsMap);
  $('relics-count').textContent = entries.length;

  if (entries.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-dim); font-size: 0.78rem;">No relics acquired yet</div>`;
    return;
  }

  container.innerHTML = entries.map(([id, relic]) => {
    const seqId = relic.RelicSequentialId || id;
    const name = formatRelicName(seqId);
    return `
      <div class="relic-card" title="${escapeHtml(name)}">
        <div class="relic-icon">🛡️</div>
        <div class="relic-name">${escapeHtml(name)}</div>
      </div>
    `;
  }).join('');
}

function renderHeroes(heroesMap) {
  const container = $('party-list');
  if (!container) return;

  const heroList = Array.isArray(heroesMap) ? heroesMap : Object.values(heroesMap);
  $('party-count').textContent = heroList.length;

  if (heroList.length === 0) {
    container.innerHTML = `<div style="color: var(--text-dim); font-size: 0.78rem;">No heroes in party</div>`;
    return;
  }

  container.innerHTML = heroList.map(hero => {
    const name = hero.Name || hero.HeroId || 'Hero';
    const hp = hero.CurrentHp !== undefined ? hero.CurrentHp : 100;
    const maxHp = hero.MaxHp || 100;
    const level = hero.Level || 1;
    const hpPercent = Math.min(100, Math.max(0, Math.round((hp / maxHp) * 100)));

    return `
      <div class="hero-card">
        <div class="hero-header">
          <span class="hero-name">${escapeHtml(name)}</span>
          <span class="hero-level">Lvl ${level}</span>
        </div>
        <div class="hp-bar-bg">
          <div class="hp-bar-fill" style="width: ${hpPercent}%;"></div>
        </div>
        <div class="hp-text">${hp} / ${maxHp} HP</div>
      </div>
    `;
  }).join('');
}

function formatRelicName(idStr) {
  if (!idStr) return 'Relic';
  return String(idStr)
    .replace(/^Relic_/i, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', initOverlay);
