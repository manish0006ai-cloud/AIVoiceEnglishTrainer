import React from 'react';

export default function FeedbackCard({ feedback, pronunciation }) {
  if (!feedback) return null;

  return (
    <>
      <div className="feedback-card">
        <div className="feedback-item">
          <span className="feedback-tag good">✓ Good</span>
          <span className="feedback-text">{feedback.good}</span>
        </div>
        <div className="feedback-item">
          <span className="feedback-tag fix">✎ Fix</span>
          <span className="feedback-text">{feedback.fix}</span>
        </div>
        <div className="feedback-item">
          <span className="feedback-tag tip">💡 Tip</span>
          <span className="feedback-text">{feedback.tip}</span>
        </div>
        {feedback.score && (
          <div className="feedback-score">
            <span className="score-val">{feedback.score}</span>
            <span>/10 English Score</span>
          </div>
        )}
      </div>
      {pronunciation?.words && pronunciation.words.length > 0 && (
        <div className="pron-card">
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9B59B6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            🎤 Pronunciation Guide
          </div>
          {pronunciation.words.map((w, i) => (
            <div key={i} style={{ marginBottom: i < pronunciation.words.length - 1 ? '8px' : 0 }}>
              <div className="pron-word">
                <strong>{w.word}</strong>
                <span className="ipa">{w.ipa}</span>
              </div>
              <div className="pron-tip">{w.tip}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
