import { useState, useRef, useCallback, useEffect } from 'react';
import { getSettings } from '../services/storageService';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const settings = getSettings();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.voiceRate || 0.9;
    utterance.pitch = settings.voicePitch || 1.0;
    utterance.lang = 'en-US';

    // Try to find a good English voice
    const allVoices = window.speechSynthesis.getVoices();
    if (settings.voiceName) {
      const saved = allVoices.find(v => v.name === settings.voiceName);
      if (saved) utterance.voice = saved;
    } else {
      const preferred = allVoices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
        || allVoices.find(v => v.lang.startsWith('en-US') && v.localService === false)
        || allVoices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); onEnd?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onEnd?.(); };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop, voices };
}
