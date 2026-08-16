/**
 * =============================================================================
 * Twitch Extension — Video Overlay Controller (overlay.js)
 * Hover-Zone Event-Driven UI & Guild Run Database Integration
 * =============================================================================
 */

const WORKER_URL = 'https://twitch-local-game-data-bridge.kalani-ehu-kai.workers.dev';

// State management
const state = {
  channelId: null,
  database: window.GUILD_RUN_DATABASE || { relics: {}, heroes: {} },
  lastPayloadStr: null,
  activeHoverZone: null,
  isFetching: false,
};

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initOverlay() {
  // 1. Ensure database reference is bound
  if (window.GUILD_RUN_DATABASE) {
    state.database = window.GUILD_RUN_DATABASE;
  }

  // 2. Listen for Twitch Extension authorization helper
  if (window.Twitch && window.Twitch.ext) {
    window.Twitch.ext.onAuthorized((auth) => {
      state.channelId = auth.channelId;
    });
  }

  // Fallback for standalone browser testing: check ?channelId=... in URL query string (case-insensitive)
  const params = new URLSearchParams(window.location.search);
  const queryChannelId = params.get('channelId') || params.get('channelID') || params.get('channelid') || params.get('cid') || params.get('channel');
  if (queryChannelId && !state.channelId) {
    state.channelId = queryChannelId;
  }

  // 3. Attach hover zone event listeners for event-driven fetching
  setupHoverZones();
}

function setupHoverZones() {
  const zoneTopLeft = $('zone-top-left');
  const zoneMiddleRight = $('zone-middle-right');

  if (zoneTopLeft) {
    zoneTopLeft.addEventListener('mouseenter', () => onZoneMouseEnter('top-left'));
    zoneTopLeft.addEventListener('mouseleave', () => onZoneMouseLeave('top-left'));
  }

  if (zoneMiddleRight) {
    zoneMiddleRight.addEventListener('mouseenter', () => onZoneMouseEnter('middle-right'));
    zoneMiddleRight.addEventListener('mouseleave', () => onZoneMouseLeave('middle-right'));
  }
}

async function onZoneMouseEnter(zoneId) {
  state.activeHoverZone = zoneId;

  // Show corresponding popover panel
  const panelId = zoneId === 'top-left' ? 'panel-top-left' : 'panel-middle-right';
  const panel = $(panelId);
  if (panel) {
    panel.classList.remove('hidden');
  }

  // EVENT-DRIVEN FETCH: Fetch fresh data from data bridge on mouseenter
  await fetchLiveGameData();
}

function onZoneMouseLeave(zoneId) {
  if (state.activeHoverZone === zoneId) {
    state.activeHoverZone = null;
  }

  // Hide popover panel smoothly
  const panelId = zoneId === 'top-left' ? 'panel-top-left' : 'panel-middle-right';
  const panel = $(panelId);
  if (panel) {
    panel.classList.add('hidden');
  }
}

async function fetchLiveGameData() {
  if (!state.channelId || state.isFetching) return;
  state.isFetching = true;

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
    // Only re-render if payload content changed
    if (payloadText === state.lastPayloadStr) {
      state.isFetching = false;
      return;
    }
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
    console.warn('[GuildRunExt] Data fetch error:', err);
    renderOfflineState();
  } finally {
    state.isFetching = false;
  }
}

function renderNoRunState(subMsg = 'No active run') {
  // Update Relics badge count
  if ($('relics-count-badge')) $('relics-count-badge').textContent = '0';
  if ($('relics-header-count')) $('relics-header-count').textContent = '0 Relics';

  // Toggle views
  if ($('active-challenge-view')) $('active-challenge-view').hidden = true;
  if ($('no-challenge-view')) $('no-challenge-view').hidden = false;
  if ($('relics-list')) $('relics-list').innerHTML = '';
  if ($('relics-empty-view')) $('relics-empty-view').hidden = false;
}

function renderOfflineState() {
  renderNoRunState('Offline');
}

function renderActiveRunState(data) {
  const session = data.RunSessionDto || {};

  // CurrentAct is 0-indexed in RunSessionDto (0 = Act 1, 1 = Act 2...)
  const rawAct = session.CurrentAct ?? session.Act ?? data.Act;
  const act = (typeof rawAct === 'number') ? (rawAct + 1) : (rawAct || 1);

  // CurrentFloor is 0-indexed in RunSessionDto (0 = Floor 1, 1 = Floor 2...)
  const rawFloor = session.CurrentFloor ?? session.Floor ?? data.Floor;
  const floor = (typeof rawFloor === 'number') ? (rawFloor + 1) : (rawFloor || 1);

  const deaths = calculateHeroDeaths(data);

  // Show active challenge view, hide empty state
  if ($('active-challenge-view')) $('active-challenge-view').hidden = false;
  if ($('no-challenge-view')) $('no-challenge-view').hidden = true;

  // Update Challenge Stats Box
  if ($('val-act')) $('val-act').textContent = act;
  if ($('val-floor')) $('val-floor').textContent = floor;
  if ($('val-deaths')) $('val-deaths').textContent = deaths;

  // Render Relics (Top-Left Zone)
  const relicsMap = data.PlayerDataDto?.ActiveRelics || data.ActiveRelics || {};
  renderRelics(relicsMap);
}

function calculateHeroDeaths(data) {
  if (typeof window.calculateHeroDeathsCustom === 'function') {
    return window.calculateHeroDeathsCustom(data);
  }
  const challenges = data.ChallengeDto?.Challenges || data.Challenges;
  if (Array.isArray(challenges)) {
    const deathChallenge = challenges.find(c => c && Number(c.Type ?? c.type) === 4);
    if (deathChallenge && deathChallenge.Progress !== undefined) {
      return deathChallenge.Progress;
    }
  }
  return 0;
}

function renderRelics(relicsMap) {
  const container = $('relics-list');
  const emptyView = $('relics-empty-view');
  if (!container) return;

  const entries = Object.entries(relicsMap);
  const count = entries.length;

  if ($('relics-count-badge')) $('relics-count-badge').textContent = count;
  if ($('relics-header-count')) $('relics-header-count').textContent = `${count} Relic${count === 1 ? '' : 's'}`;

  if (count === 0) {
    container.innerHTML = '';
    if (emptyView) emptyView.hidden = false;
    return;
  }

  if (emptyView) emptyView.hidden = true;

  container.innerHTML = entries.map(([idKey, relic]) => {
    // Resolve candidates: e.g. "Relic_900", "900", "Relic_GoldenShield"
    const rawVal = (typeof relic === 'object' && relic !== null)
      ? (relic.RelicSequentialId ?? relic.RelicId ?? relic.Id ?? relic.id ?? idKey)
      : (relic ?? idKey);
    
    const strVal = String(rawVal).trim();
    const numId = strVal.replace(/^Relic_/i, '');
    
    const candidates = [
      `Relic_${numId}`,
      numId,
      strVal,
      `Relic_${strVal}`
    ];

    let dbEntry = null;
    if (state.database && state.database.relics) {
      for (const key of candidates) {
        if (state.database.relics[key]) {
          dbEntry = state.database.relics[key];
          break;
        }
      }
    }

    const name = dbEntry?.name || 'Unknown Relic';
    const description = dbEntry?.description || `${numId} is not in the database`;
    const rarity = (dbEntry?.rarity || 'common').toLowerCase();
    return `
      <div class="relic-card rarity-${rarity}" title="${escapeHtml(name)} — ${escapeHtml(description)}">
        <div class="relic-info">
          <div class="relic-header-line">
            <span class="relic-name">${escapeHtml(name)}</span>
            ${dbEntry?.rarity ? `<span class="relic-rarity-badge rarity-${rarity}">${escapeHtml(dbEntry.rarity)}</span>` : ''}
          </div>
          <div class="relic-desc">${escapeHtml(description)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderHeroes(heroesMap) {
  const container = $('party-list');
  if (!container) return;

  const heroList = Array.isArray(heroesMap) ? heroesMap : Object.values(heroesMap);
  if ($('party-count')) $('party-count').textContent = heroList.length;

  if (heroList.length === 0) {
    container.innerHTML = `<div class="empty-subtext">No heroes currently in party</div>`;
    return;
  }

  container.innerHTML = heroList.map(hero => {
    const rawHeroId = hero.HeroId || hero.Id;
    const dbHero = state.database.heroes?.[rawHeroId] || {};
    const name = hero.Name || dbHero.name || rawHeroId || 'Hero';
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
