const API_BASE = 'http://localhost:3001/api';

// --- Helpers ---

async function getAuthToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken;
}

async function apiRequest(method, path, body = null) {
  const token = await getAuthToken();
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    sendResponse({ error: err.message });
  });
  return true; // keep channel open for async response
});

async function handleMessage(message) {
  switch (message.type) {
    case 'SCORE_JOBS':
      return await scoreJobs(message.jobs);

    case 'IMPORT_PROFILE':
      return await importProfile(message.profileData);

    case 'GET_MATCHES':
      return await getMatches(message.params);

    case 'GET_STATS':
      return await getStats();

    case 'UPDATE_SETTINGS':
      return await updateSettings(message.settings);

    case 'CHECK_AUTH':
      return await checkAuth();

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// --- Actions ---

async function scoreJobs(jobs) {
  try {
    const result = await apiRequest('POST', '/jobs/score', { jobs });
    // Cache scores locally
    const { jobScoreCache = {} } = await chrome.storage.local.get('jobScoreCache');
    for (const score of result.scores) {
      jobScoreCache[score.jobId || score.url] = {
        ...score,
        cachedAt: Date.now(),
      };
    }
    await chrome.storage.local.set({ jobScoreCache });

    // Update match counts
    const newStrong = result.scores.filter(s => s.score >= 80).length;
    const { matchStats = { total: 0, strong: 0, newToday: 0 } } = await chrome.storage.local.get('matchStats');
    matchStats.total += result.scores.length;
    matchStats.strong += newStrong;
    matchStats.newToday += result.scores.length;
    await chrome.storage.local.set({ matchStats });

    return { scores: result.scores };
  } catch (err) {
    console.error('JobLens: Failed to score jobs', err);
    throw err;
  }
}

async function importProfile(profileData) {
  const result = await apiRequest('POST', '/profile/import', profileData);
  return result;
}

async function getMatches(params = {}) {
  const query = new URLSearchParams(params).toString();
  return await apiRequest('GET', `/matches?${query}`);
}

async function getStats() {
  const { matchStats = { total: 0, strong: 0, newToday: 0 } } = await chrome.storage.local.get('matchStats');
  return matchStats;
}

async function updateSettings(settings) {
  await chrome.storage.local.set({ settings });
  // Update alarm based on notification preference
  if (settings.notificationsEnabled) {
    chrome.alarms.create('checkMatches', { periodInMinutes: 30 });
  } else {
    chrome.alarms.clear('checkMatches');
  }
  return { success: true };
}

async function checkAuth() {
  const token = await getAuthToken();
  if (!token) return { authenticated: false };
  try {
    const user = await apiRequest('GET', '/auth/me');
    return { authenticated: true, user };
  } catch {
    return { authenticated: false };
  }
}

// --- Periodic Match Check ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'checkMatches') return;

  try {
    const result = await apiRequest('GET', '/matches?status=new&minScore=75&limit=5');
    if (result.matches && result.matches.length > 0) {
      const { settings = {} } = await chrome.storage.local.get('settings');
      if (settings.notificationsEnabled !== false) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: `${result.matches.length} new strong matches`,
          message: `Top match: ${result.matches[0].title} at ${result.matches[0].company} (${result.matches[0].score}% match)`,
        });
      }
    }
  } catch (err) {
    console.error('JobLens: Periodic check failed', err);
  }
});

// --- Init ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    matchStats: { total: 0, strong: 0, newToday: 0 },
    settings: { notificationsEnabled: true },
  });
  chrome.alarms.create('checkMatches', { periodInMinutes: 30 });

  // Reset daily counters at midnight
  chrome.alarms.create('resetDaily', { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDaily') {
    chrome.storage.local.get('matchStats', ({ matchStats = {} }) => {
      matchStats.newToday = 0;
      chrome.storage.local.set({ matchStats });
    });
  }
});
