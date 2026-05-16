import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordMode, setIsWakeWordMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const interimRef = useRef('');
  const onStopCallbackRef = useRef(null);
  const onWakeWordDetectedRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      
      const fullText = (final + interim).toLowerCase();
      
      // Check for Wake Word "Hey Angelina" or "Angelina"
      if (onWakeWordDetectedRef.current && (fullText.includes('angelina') || fullText.includes('hey angelina'))) {
        const callback = onWakeWordDetectedRef.current;
        onWakeWordDetectedRef.current = null; // Prevent double trigger
        setIsWakeWordMode(false);
        recognition.stop();
        setTimeout(() => callback(), 100);
        return;
      }

      finalTranscriptRef.current = final.trim();
      interimRef.current = interim;
      setTranscript(final.trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        if (onWakeWordDetectedRef.current) {
          // In wake word mode, just restart if no speech detected
          try { recognition.stop(); } catch {}
        }
        return;
      }
      if (event.error === 'aborted') return;
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
      setIsWakeWordMode(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // If we are in wake word mode, restart automatically
      if (onWakeWordDetectedRef.current) {
        try { recognition.start(); setIsListening(true); } catch {}
        return;
      }

      // When normal recognition ends, combine final + interim as the complete text
      const completeText = (finalTranscriptRef.current + ' ' + interimRef.current).trim();
      if (onStopCallbackRef.current && completeText) {
        onStopCallbackRef.current(completeText);
        onStopCallbackRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    return () => { try { recognition.abort(); } catch {} };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimRef.current = '';
    onStopCallbackRef.current = null;
    onWakeWordDetectedRef.current = null;
    setIsWakeWordMode(false);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      try { recognitionRef.current.stop(); } catch {}
      setTimeout(() => {
        try { recognitionRef.current.start(); setIsListening(true); } catch {}
      }, 100);
    }
  }, []);

  const stopListening = useCallback((onComplete) => {
    if (!recognitionRef.current) return;
    onStopCallbackRef.current = onComplete || null;
    onWakeWordDetectedRef.current = null;
    setIsWakeWordMode(false);
    try { recognitionRef.current.stop(); } catch {}
  }, []);

  const startWakeWordDetection = useCallback((onDetected) => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimRef.current = '';
    onWakeWordDetectedRef.current = onDetected;
    setIsWakeWordMode(true);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      try { recognitionRef.current.stop(); } catch {}
      setTimeout(() => {
        try { recognitionRef.current.start(); setIsListening(true); } catch {}
      }, 100);
    }
  }, []);

  return { 
    isListening, 
    isWakeWordMode,
    transcript, 
    interimTranscript, 
    error, 
    isSupported, 
    startListening, 
    stopListening,
    startWakeWordDetection 
  };
}
