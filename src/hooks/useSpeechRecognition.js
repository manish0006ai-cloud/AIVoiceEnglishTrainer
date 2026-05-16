import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const interimRef = useRef('');
  const onStopCallbackRef = useRef(null);

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
      finalTranscriptRef.current = final.trim();
      interimRef.current = interim;
      setTranscript(final.trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted') return;
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // When recognition ends, combine final + interim as the complete text
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
    // Register callback for when recognition fully stops
    onStopCallbackRef.current = onComplete || null;
    try { recognitionRef.current.stop(); } catch {}
  }, []);

  return { isListening, transcript, interimTranscript, error, isSupported, startListening, stopListening };
}
