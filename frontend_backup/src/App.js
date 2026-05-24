import React, { useState, useEffect, useRef } from 'react';
import JarvisCore from './components/JarvisCore';
import './App.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [status, setStatus] = useState('idle'); // idle, listening, thinking, speaking
  const [transcript, setTranscript] = useState('');
  const [jarvisResponse, setJarvisResponse] = useState('');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onend = () => {
        if (status === 'listening') {
          // If we stopped listening, simulate thinking then respond
          setStatus('thinking');
          simulateAIResponse();
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setStatus('idle');
      };
    } else {
      console.error('SpeechRecognition API not supported in this browser.');
    }
  }, [status]);

  const simulateAIResponse = () => {
    // In a real app, you would send `transcript` to an LLM API here.
    // We mock a delay to represent network request.
    setTimeout(() => {
      const responses = [
        "I am processing your request, sir.",
        "Right away. The systems are fully operational.",
        "I have analyzed the data you requested.",
        "Standing by for further instructions."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setJarvisResponse(randomResponse);
      speak(randomResponse);
    }, 2000);
  };

  const speak = (text) => {
    if (synthRef.current) {
      setStatus('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a British or tech-sounding voice
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(voice => voice.name.includes('Google UK English Male') || voice.lang === 'en-GB') || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.pitch = 0.9; // slightly deeper
      utterance.rate = 1.0;
      
      utterance.onend = () => {
        setStatus('idle');
        setTranscript('');
      };
      
      synthRef.current.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setJarvisResponse('');
      setTranscript('');
      setStatus('listening');
      recognitionRef.current.start();
    }
  };

  return (
    <div style={styles.appContainer}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>J.A.R.V.I.S.</h1>
        <div style={styles.statusIndicator}>
          <div style={{...styles.statusDot, backgroundColor: status !== 'idle' ? '#00d2ff' : '#444', boxShadow: status !== 'idle' ? '0 0 10px #00d2ff' : 'none'}} />
          <span>{status.toUpperCase()}</span>
        </div>
      </div>
      
      <div style={styles.mainContent}>
        <JarvisCore status={status} />
      </div>

      <div className="glass-panel" style={styles.transcriptBox}>
        <p style={styles.userText}>
          <span style={styles.label}>USER:</span> {transcript || "..."}
        </p>
        <p style={styles.aiText}>
          <span style={styles.label}>J.A.R.V.I.S:</span> {jarvisResponse || "..."}
        </p>
      </div>

      <button 
        style={{...styles.micButton, opacity: status === 'listening' ? 0.5 : 1}} 
        onClick={startListening}
        disabled={status !== 'idle'}
      >
        INITIALIZE COMM LINK
      </button>
    </div>
  );
}

const styles = {
  appContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '40px',
  },
  topBar: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 40px',
  },
  title: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '28px',
    letterSpacing: '5px',
    color: '#00d2ff',
    margin: 0,
    textShadow: '0 0 15px rgba(0, 210, 255, 0.5)',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '14px',
    color: '#e0f7fa',
    opacity: 0.8,
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptBox: {
    width: '80%',
    maxWidth: '800px',
    padding: '20px',
    marginBottom: '30px',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '15px',
  },
  label: {
    fontFamily: 'Orbitron, sans-serif',
    color: 'rgba(0, 210, 255, 0.7)',
    marginRight: '10px',
    fontSize: '14px',
  },
  userText: {
    margin: 0,
    fontSize: '18px',
    color: '#fff',
    fontWeight: 300,
  },
  aiText: {
    margin: 0,
    fontSize: '20px',
    color: '#00d2ff',
    fontWeight: 500,
    textShadow: '0 0 5px rgba(0, 210, 255, 0.3)',
  },
  micButton: {
    backgroundColor: 'transparent',
    border: '1px solid #00d2ff',
    color: '#00d2ff',
    padding: '15px 40px',
    fontSize: '16px',
    fontFamily: 'Orbitron, sans-serif',
    letterSpacing: '2px',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textShadow: '0 0 10px rgba(0, 210, 255, 0.5)',
    boxShadow: '0 0 15px rgba(0, 210, 255, 0.2), inset 0 0 10px rgba(0, 210, 255, 0.1)',
  }
};

export default App;
