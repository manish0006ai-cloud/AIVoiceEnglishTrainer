import React, { useState } from 'react';
import { getSettings, saveSettings, getApiKey, setApiKey } from '../services/storageService';
import { initGemini } from '../services/geminiService';

export default function SettingsModal({ onClose }) {
  const [settings, setSettingsState] = useState(getSettings());
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  const voices = window.speechSynthesis?.getVoices().filter(v => v.lang.startsWith('en')) || [];

  const handleSave = () => {
    setApiKey(apiKey);
    saveSettings(settings);
    if (apiKey) initGemini(apiKey);
    setSaved(true);
    setTimeout(() => onClose(), 800);
  };

  const handleClearData = () => {
    if (confirm('Clear all session data and progress? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>⚙️ Settings</h2>

        <div className="modal-field">
          <label>Gemini API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder="Enter your Google Gemini API key"
          />
          <p className="hint">Get your key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Google AI Studio</a></p>
        </div>

        <div className="modal-field">
          <label>Voice Speed</label>
          <input
            type="range" min="0.5" max="1.5" step="0.1"
            value={settings.voiceRate}
            onChange={(e) => setSettingsState({ ...settings, voiceRate: parseFloat(e.target.value) })}
          />
          <p className="hint">Speed: {settings.voiceRate}x</p>
        </div>

        <div className="modal-field">
          <label>Voice Pitch</label>
          <input
            type="range" min="0.5" max="2" step="0.1"
            value={settings.voicePitch}
            onChange={(e) => setSettingsState({ ...settings, voicePitch: parseFloat(e.target.value) })}
          />
          <p className="hint">Pitch: {settings.voicePitch}</p>
        </div>

        {voices.length > 0 && (
          <div className="modal-field">
            <label>Voice</label>
            <select
              value={settings.voiceName}
              onChange={(e) => setSettingsState({ ...settings, voiceName: e.target.value })}
            >
              <option value="">Auto (Best Available)</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleClearData} style={{ marginLeft: 'auto' }}>
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
}
