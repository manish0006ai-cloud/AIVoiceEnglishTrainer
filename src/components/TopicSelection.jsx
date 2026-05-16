import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories, modes } from '../data/topics';
import { getApiKey } from '../services/storageService';

export default function TopicSelection({ selectedMode, onModeChange, onOpenSettings }) {
  const navigate = useNavigate();
  const [expandedCat, setExpandedCat] = useState(null);

  const handleTopicClick = (topic, category) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    navigate('/chat', { state: { topic, category, mode: selectedMode } });
  };

  return (
    <div style={{ flex: 1 }}>
      {/* Mode Selector */}
      <div className="mode-selector">
        {modes.map((m) => (
          <button
            key={m.id}
            className={`mode-chip ${selectedMode === m.id ? 'active' : ''}`}
            onClick={() => onModeChange(m.id)}
          >
            <span className="chip-icon">{m.icon}</span>
            {m.label}
            <span className="chip-desc">— {m.desc}</span>
          </button>
        ))}
      </div>

      {/* Topics */}
      <div className="topics-container">
        <h2 className="topics-title">Choose Your Topic</h2>
        <p className="topics-subtitle">Select a topic to start practising your English with AI</p>

        <div className="category-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="category-card">
              <div
                className="category-header"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                <div
                  className="category-icon"
                  style={{ background: `${cat.color}20` }}
                >
                  {cat.icon}
                </div>
                <div className="category-info">
                  <h3>{cat.label}</h3>
                  <p>{cat.topics.length} topics</p>
                </div>
                <span style={{
                  marginLeft: 'auto', fontSize: '14px', color: 'var(--text-muted)',
                  transition: 'transform 0.3s', transform: expandedCat === cat.id ? 'rotate(180deg)' : 'rotate(0)'
                }}>▼</span>
              </div>

              {(expandedCat === cat.id || expandedCat === null) && (
                <div className="category-topics">
                  {cat.topics.map((topic) => (
                    <button
                      key={topic.id}
                      className="topic-btn"
                      onClick={() => handleTopicClick(topic, cat)}
                    >
                      <span className="t-icon">{topic.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{topic.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                          {topic.starter.slice(0, 50)}...
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
