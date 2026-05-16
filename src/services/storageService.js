const STORAGE_KEYS = {
  API_KEY: 'vet_api_key',
  SESSIONS: 'vet_sessions',
  PROGRESS: 'vet_progress',
  SETTINGS: 'vet_settings',
  STREAK: 'vet_streak',
};

function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setItem(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ---------- API Key ---------- */
export function getApiKey() { return localStorage.getItem(STORAGE_KEYS.API_KEY) || ''; }
export function setApiKey(key) { localStorage.setItem(STORAGE_KEYS.API_KEY, key); }

/* ---------- Settings ---------- */
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS, { voiceRate: 0.9, voicePitch: 1.0, voiceName: '' });
}
export function saveSettings(s) { setItem(STORAGE_KEYS.SETTINGS, s); }

/* ---------- Sessions ---------- */
export function getSessions() { return getItem(STORAGE_KEYS.SESSIONS, []); }

export function saveSession(session) {
  const sessions = getSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  setItem(STORAGE_KEYS.SESSIONS, sessions);
}

export function createSession(topic, mode) {
  return {
    id: `s_${Date.now()}`,
    topic, mode,
    startedAt: new Date().toISOString(),
    turns: [],
    avgScore: 0,
  };
}

export function addTurn(session, turn) {
  session.turns.push({ ...turn, createdAt: new Date().toISOString() });
  const scores = session.turns.filter(t => t.feedback?.score).map(t => t.feedback.score);
  session.avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  return session;
}

/* ---------- Progress / Streak ---------- */
export function getProgress() { return getItem(STORAGE_KEYS.PROGRESS, {}); }

export function updateProgress(session) {
  const progress = getProgress();
  const today = new Date().toISOString().slice(0, 10);
  if (!progress[today]) progress[today] = { dailyScore: 0, sessionsCount: 0, totalTurns: 0, topicsUsed: [] };
  const d = progress[today];
  d.sessionsCount += 1;
  d.totalTurns += session.turns.length;
  if (session.avgScore) d.dailyScore = Math.round(((d.dailyScore * (d.sessionsCount - 1) + session.avgScore) / d.sessionsCount) * 10) / 10;
  if (!d.topicsUsed.includes(session.topic)) d.topicsUsed.push(session.topic);
  setItem(STORAGE_KEYS.PROGRESS, progress);
  updateStreak();
}

export function getStreak() { return getItem(STORAGE_KEYS.STREAK, { current: 0, longest: 0, lastDate: null }); }

function updateStreak() {
  const streak = getStreak();
  const today = new Date().toISOString().slice(0, 10);
  if (streak.lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (streak.lastDate === yesterday) {
    streak.current += 1;
  } else {
    streak.current = 1;
  }
  streak.longest = Math.max(streak.longest, streak.current);
  streak.lastDate = today;
  setItem(STORAGE_KEYS.STREAK, streak);
}

export function getStats() {
  const sessions = getSessions();
  const progress = getProgress();
  const streak = getStreak();
  const totalSessions = sessions.length;
  const totalTurns = sessions.reduce((a, s) => a + s.turns.length, 0);
  const allScores = sessions.filter(s => s.avgScore).map(s => s.avgScore);
  const avgScore = allScores.length ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : 0;
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last7.push({ date: d, score: progress[d]?.dailyScore || 0, sessions: progress[d]?.sessionsCount || 0 });
  }
  return { totalSessions, totalTurns, avgScore, streak, last7, progress };
}
