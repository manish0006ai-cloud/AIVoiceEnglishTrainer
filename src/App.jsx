import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TopicSelection from './components/TopicSelection';
import VoiceChat from './components/VoiceChat';
import ProgressDashboard from './components/ProgressDashboard';
import SettingsModal from './components/SettingsModal';
import { getApiKey } from './services/storageService';
import { initGemini } from './services/geminiService';

export default function App() {
  const [selectedMode, setSelectedMode] = useState('conversation');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const apiKey = getApiKey();
    if (apiKey) initGemini(apiKey);
  }, []);

  return (
    <>
      <Header onOpenSettings={() => setShowSettings(true)} />
      <Routes>
        <Route path="/" element={
          <TopicSelection
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            onOpenSettings={() => setShowSettings(true)}
          />
        } />
        <Route path="/chat" element={<VoiceChat />} />
        <Route path="/progress" element={<ProgressDashboard />} />
      </Routes>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
