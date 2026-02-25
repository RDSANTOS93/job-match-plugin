document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const authSection = document.getElementById('auth-section');
  const mainSection = document.getElementById('main-section');

  try {
    const authStatus = await sendMessage({ type: 'CHECK_AUTH' });

    loadingEl.classList.add('hidden');

    if (!authStatus.authenticated) {
      authSection.classList.remove('hidden');
      return;
    }

    mainSection.classList.remove('hidden');
    document.getElementById('user-name').textContent = authStatus.user.name || authStatus.user.email;

    // Load stats
    const stats = await sendMessage({ type: 'GET_STATS' });
    document.getElementById('stat-total').textContent = stats.total || 0;
    document.getElementById('stat-strong').textContent = stats.strong || 0;
    document.getElementById('stat-today').textContent = stats.newToday || 0;

    // Load recent matches
    try {
      const matchData = await sendMessage({ type: 'GET_MATCHES', params: { minScore: 70, limit: 3 } });
      if (matchData.matches && matchData.matches.length > 0) {
        renderMatches(matchData.matches);
      }
    } catch (e) {
      // matches may not exist yet
    }

    // Load notification setting
    const { settings = {} } = await chrome.storage.local.get('settings');
    document.getElementById('notifications-toggle').checked = settings.notificationsEnabled !== false;

  } catch (err) {
    loadingEl.classList.add('hidden');
    authSection.classList.remove('hidden');
  }

  // Notification toggle handler
  document.getElementById('notifications-toggle').addEventListener('change', async (e) => {
    await sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { notificationsEnabled: e.target.checked }
    });
  });
});

function renderMatches(matches) {
  const listEl = document.getElementById('matches-list');
  listEl.innerHTML = '';

  matches.forEach(match => {
    const scoreClass = match.score >= 80 ? 'high' : match.score >= 60 ? 'medium' : 'low';
    const item = document.createElement('a');
    item.href = match.url || '#';
    item.target = '_blank';
    item.className = 'match-item';
    item.innerHTML = `
      <div class="match-score match-score--${scoreClass}">${match.score}%</div>
      <div class="match-info">
        <div class="match-title">${escapeHtml(match.title)}</div>
        <div class="match-company">${escapeHtml(match.company)}</div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
