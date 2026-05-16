import React from 'react';
import { getStats, getSessions } from '../services/storageService';
import { categories } from '../data/topics';

export default function ProgressDashboard() {
  const stats = getStats();
  const sessions = getSessions();

  const findTopicLabel = (topicId) => {
    for (const cat of categories) {
      const t = cat.topics.find(t => t.id === topicId);
      if (t) return { label: t.label, icon: t.icon };
    }
    return { label: topicId, icon: '📝' };
  };

  const maxScore = Math.max(...stats.last7.map(d => d.score), 1);

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Your Progress</h2>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ animationDelay: '0s' }}>
          <div className="stat-icon">📚</div>
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.1s' }}>
          <div className="stat-icon">💬</div>
          <div className="stat-value">{stats.totalTurns}</div>
          <div className="stat-label">Messages Sent</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.2s' }}>
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats.avgScore || '—'}</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.3s' }}>
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats.streak.current}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>

      {/* Score Chart */}
      <div className="chart-card">
        <h3>📈 Last 7 Days Scores</h3>
        <div className="chart-bars">
          {stats.last7.map((day, i) => (
            <div className="chart-bar-wrap" key={i}>
              <div className="chart-value">{day.score || ''}</div>
              <div
                className={`chart-bar ${day.score === 0 ? 'empty' : ''}`}
                style={{ height: `${day.score ? (day.score / 10) * 100 : 5}%` }}
              />
              <div className="chart-label">
                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="chart-card">
        <h3>📋 Recent Sessions</h3>
        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎙</div>
            <h3>No sessions yet</h3>
            <p>Start a conversation to see your history here!</p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.slice(0, 10).map((session) => {
              const topicInfo = findTopicLabel(session.topic);
              return (
                <div className="session-item" key={session.id}>
                  <span className="s-icon">{topicInfo.icon}</span>
                  <div className="s-info">
                    <h4>{topicInfo.label}</h4>
                    <p>{session.mode} • {session.turns.length} turns • {new Date(session.startedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="s-score">{session.avgScore || '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
