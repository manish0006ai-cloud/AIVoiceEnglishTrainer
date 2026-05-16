import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { initGemini, startChat, sendMessage, isInitialized } from '../services/geminiService';
import { getApiKey, createSession, addTurn, saveSession, updateProgress } from '../services/storageService';
import FeedbackCard from './FeedbackCard';

export default function VoiceChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic, category, mode } = location.state || {};
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('ready'); // ready | listening | thinking | playing
  const [sessionData, setSessionData] = useState(null);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef(null);
  const chatInitRef = useRef(false);

  const { isListening, transcript, interimTranscript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  // Init chat on mount
  useEffect(() => {
    if (!topic || chatInitRef.current) return;
    chatInitRef.current = true;

    const apiKey = getApiKey();
    if (!apiKey) { navigate('/'); return; }
    if (!isInitialized()) initGemini(apiKey);

    try {
      startChat(mode, topic.label, topic.starter);
      const session = createSession(topic.id, mode);
      setSessionData(session);

      // Add AI greeting
      const greeting = `Great choice! ${topic.starter} Take your time and speak naturally — I am here to help you practise!`;
      setMessages([{
        id: 'm_0', role: 'ai', text: greeting,
        feedback: null, pronunciation: null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('playing');
      speak(greeting, () => setStatus('ready'));
    } catch (e) {
      setMessages([{ id: 'm_err', role: 'ai', text: `Error: ${e.message}. Please check your API key in Settings.`, feedback: null, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }
  }, [topic, mode, navigate, speak]);

  // Update status based on listening/speaking
  useEffect(() => {
    if (isListening) setStatus('listening');
    else if (isSpeaking) setStatus('playing');
  }, [isListening, isSpeaking]);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Handle mic toggle
  const handleMicToggle = async () => {
    if (isListening) {
      stopListening((finalText) => {
        handleSend(finalText || transcript);
      });
    } else {
      stopSpeaking();
      startListening();
    }
  };

  // Send message to Gemini
  const handleSend = async (text) => {
    const userText = text?.trim();
    if (!userText) { setStatus('ready'); return; }

    const userMsg = {
      id: `m_${Date.now()}`, role: 'user', text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setStatus('thinking');

    try {
      const response = await sendMessage(userText);
      const aiMsg = {
        id: `m_${Date.now() + 1}`, role: 'ai',
        text: response.reply, feedback: response.feedback,
        pronunciation: response.pronunciation,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);

      // Save to session
      if (sessionData) {
        const updated = addTurn(sessionData, {
          role: 'user', transcript: userText, aiReply: response.reply,
          feedback: response.feedback, pronunciations: response.pronunciation?.words,
        });
        setSessionData({ ...updated });
        saveSession(updated);
      }

      // Speak AI reply
      setStatus('playing');
      speak(response.reply, () => setStatus('ready'));
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `m_err_${Date.now()}`, role: 'ai',
        text: `Sorry, I encountered an error: ${e.message}. Please try again.`,
        feedback: null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('ready');
    }
  };

  // Replay last AI message
  const handleReplay = () => {
    const lastAi = [...messages].reverse().find(m => m.role === 'ai');
    if (lastAi) {
      setStatus('playing');
      speak(lastAi.text, () => setStatus('ready'));
    }
  };

  // End session
  const handleEnd = () => {
    stopSpeaking();
    if (sessionData && sessionData.turns.length > 0) {
      updateProgress(sessionData);
    }
    navigate('/');
  };

  if (!topic) { navigate('/'); return null; }

  return (
    <div className="chat-container">
      {/* Topic Banner */}
      <div className="topic-banner">
        <button className="back-btn" onClick={handleEnd} aria-label="Go back">←</button>
        <span className="banner-icon">{topic.icon}</span>
        <div className="banner-info">
          <h2>{topic.label}</h2>
          <p>{mode} mode • {messages.filter(m => m.role === 'user').length} turns</p>
        </div>
        <button className="btn btn-secondary" onClick={handleEnd} style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '12px' }}>
          End Session
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-bubble">{msg.text}</div>
            {msg.role === 'ai' && msg.feedback && (
              <FeedbackCard feedback={msg.feedback} pronunciation={msg.pronunciation} />
            )}
            <span className="message-time">{msg.time}</span>
          </div>
        ))}
        {status === 'thinking' && (
          <div className="message ai">
            <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="loading-spinner" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        {/* Transcript Preview */}
        <div className={`transcript-preview ${!transcript && !interimTranscript && !isListening ? 'empty' : ''}`}>
          {isListening ? (
            <>
              {transcript && <span>{transcript} </span>}
              {interimTranscript && <span className="interim">{interimTranscript}</span>}
              {!transcript && !interimTranscript && <span className="interim">Listening... speak now</span>}
            </>
          ) : transcript ? (
            <span>{transcript}</span>
          ) : (
            <span>Tap the mic button and start speaking</span>
          )}
        </div>

        {/* Waveform */}
        {isListening && (
          <div className="waveform" style={{ marginBottom: '12px' }}>
            {[...Array(8)].map((_, i) => <div key={i} className="bar" />)}
          </div>
        )}

        {/* Text Input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            id="text-input"
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textInput.trim()) {
                handleSend(textInput.trim());
                setTextInput('');
              }
            }}
            placeholder="Or type your message here..."
            disabled={status === 'thinking'}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '14px', fontFamily: 'inherit',
              outline: 'none', transition: 'var(--transition)',
            }}
          />
          <button
            id="send-text-btn"
            className="btn btn-primary"
            onClick={() => { handleSend(textInput.trim()); setTextInput(''); }}
            disabled={!textInput.trim() || status === 'thinking'}
            style={{ padding: '12px 20px', fontSize: '16px' }}
          >📤</button>
        </div>

        {/* Controls */}
        <div className="mic-controls">
          <button
            className="side-btn"
            onClick={handleReplay}
            disabled={status === 'listening' || status === 'thinking'}
            aria-label="Replay last AI response"
            title="Replay"
          >🔄</button>

          <button
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={handleMicToggle}
            disabled={status === 'thinking'}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? '⏹' : '🎤'}
          </button>

          <button
            className="side-btn"
            onClick={() => { 
              if (isListening) {
                stopListening((finalText) => handleSend(finalText || transcript));
              } else {
                handleSend(transcript);
              }
            }}
            disabled={!transcript || status === 'thinking'}
            aria-label="Send message"
            title="Send"
          >📤</button>
        </div>

        {/* Status Bar */}
        <div className={`status-bar ${status}`}>
          {status === 'ready' && '● Ready'}
          {status === 'listening' && '🔴 Listening...'}
          {status === 'thinking' && '🟡 AI is thinking...'}
          {status === 'playing' && '🔵 Speaking...'}
        </div>
      </div>
    </div>
  );
}
