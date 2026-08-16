const WORKER_URL = 'https://twitch-local-game-data-bridge.kalani-ehu-kai.workers.dev';
let channelId = null;

if (window.Twitch && window.Twitch.ext) {
  window.Twitch.ext.onAuthorized((auth) => {
    channelId = auth.channelId;
  });
}

document.getElementById('test-btn')?.addEventListener('click', async () => {
  const statusEl = document.getElementById('test-status');
  if (!statusEl) return;

  statusEl.hidden = false;
  statusEl.className = 'status-badge';
  statusEl.textContent = 'Testing connection...';

  if (!channelId) {
    statusEl.className = 'status-badge status-err';
    statusEl.textContent = '⚠️ Not running inside Twitch Extension container';
    return;
  }

  try {
    const res = await fetch(`${WORKER_URL}/data/${channelId}/guild-run/data`);
    if (res.ok) {
      statusEl.className = 'status-badge status-ok';
      statusEl.textContent = '✅ Bridge connection successful! Active data stream detected.';
    } else if (res.status === 404) {
      statusEl.className = 'status-badge status-ok';
      statusEl.textContent = '✅ Bridge online! No active game data uploaded yet.';
    } else {
      statusEl.className = 'status-badge status-err';
      statusEl.textContent = `⚠️ Bridge returned status ${res.status}`;
    }
  } catch (err) {
    statusEl.className = 'status-badge status-err';
    statusEl.textContent = `❌ Error reaching bridge: ${err.message}`;
  }
});
