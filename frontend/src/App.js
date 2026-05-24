import React, { useState, useEffect, useRef } from 'react';
import logo from './logo.svg';
import './App.css';
import Navbar from './component/Navbar';
import BlobParticles from './component/blob';
import Terminal from './component/Terminal';
import { LocationWidget, HardwareWidget, SoftwareStatusWidget, TimeWeatherWidget, GreetingWidget } from './component/Widgets';

function App() {
  const [blobColor, setBlobColor] = useState(() => localStorage.getItem('jarvis_blobColor') || '#00e5ff');
  const [blobSize, setBlobSize] = useState(() => parseFloat(localStorage.getItem('jarvis_blobSize')) || 1);
  const [blobSensitivity, setBlobSensitivity] = useState(() => parseFloat(localStorage.getItem('jarvis_blobSensitivity')) || 3.5);
  const [blobPosition, setBlobPosition] = useState(() => {
    const saved = localStorage.getItem('jarvis_blobPosition_v2');
    // Default perfectly centered vertically on the left edge, between the two widgets
    return saved ? JSON.parse(saved) : { top: '50%', left: '-30px', transform: 'translateY(-50%)' };
  });
  const [isBlobDraggable, setIsBlobDraggable] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false); // Ref for precise auto-restarting

  // Geolocation & Reverse Geocoding State
  const [location, setLocation] = useState({ lat: null, lon: null, city: '', region: '', country: '', loading: true, error: false });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(res => res.json())
            .then(data => {
              setLocation({
                lat, lon,
                city: data.address.city || data.address.town || data.address.county || 'Unknown City',
                region: data.address.state || data.address.region || '',
                country: data.address.country || '',
                loading: false, error: false
              });
            })
            .catch(() => setLocation({ lat, lon, city: 'Unknown', region: '', country: '', loading: false, error: false }));
        },
        (err) => {
          setLocation(prev => ({ ...prev, loading: false, error: true }));
        }
      );
    } else {
      setLocation(prev => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  // Groq LLM & TTS state
  const [jarvisResponse, setJarvisResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const fetchGroqResponse = async (text) => {
    if (isProcessingRef.current || text.trim() === '') return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setJarvisResponse(''); 

    // DO NOT stop the microphone engine. Chrome gets stuck in a zombie state if you manually stop it too often.
    // We just keep it running and software-ignore the inputs via the isProcessingRef lock!
    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Backend error");
      }
      
      const data = await response.json();
      const fullText = data.response;

      // 1. INSTANT LOCAL TTS (0.0s latency)
      const synth = window.speechSynthesis;
      synth.cancel(); // stop any current speech
      const utterance = new SpeechSynthesisUtterance(fullText);
      const voices = synth.getVoices();
      const bestVoice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Male')) || 
                        voices.find(v => v.lang === 'en-GB') || 
                        voices[0];
      if (bestVoice) utterance.voice = bestVoice;
      utterance.rate = 1.15; // Fast and snappy
      let speechDone = false;
      let typewriterDone = false;

      const checkUnlock = () => {
        if (speechDone && typewriterDone) {
          setIsProcessing(false);
          isProcessingRef.current = false;
        }
      };

      // Failsafe unlock after 8 seconds just in case TTS bugs out and doesn't fire onend
      const failsafe = setTimeout(() => { speechDone = true; checkUnlock(); }, 8000);

      utterance.onend = () => {
        clearTimeout(failsafe);
        speechDone = true; 
        checkUnlock();
      };

      synth.speak(utterance);

      // 2. Local Visual Typewriter Effect
      for (let i = 0; i < fullText.length; i++) {
        setJarvisResponse((prev) => prev + fullText[i]);
        await new Promise(r => setTimeout(r, 20)); 
      }
      typewriterDone = true;
      checkUnlock();

    } catch (err) {
      console.error(err);
      setJarvisResponse("[Error connecting to J.A.R.V.I.S Backend Server]");
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  // Sync state with ref
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Save to local storage whenever settings change
  useEffect(() => {
    localStorage.setItem('jarvis_blobColor', blobColor);
    localStorage.setItem('jarvis_blobSize', blobSize);
    localStorage.setItem('jarvis_blobSensitivity', blobSensitivity);
    localStorage.setItem('jarvis_blobPosition_v2', JSON.stringify(blobPosition));
  }, [blobColor, blobSize, blobSensitivity, blobPosition]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Reverted to en-IN which has a better acoustic model for Indian male low pitches

      let speechTimeout = null;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript(''); // Clear previous text or errors
      };

      recognition.onresult = (event) => {
        // If Jarvis is talking/typing, throw away any audio picked up to prevent looping or dropped states
        if (isProcessingRef.current) return;

        // Since we never manually stop the engine, event.results grows. We only read the latest phrase.
        const currentIndex = event.results.length - 1;
        const currentTranscript = event.results[currentIndex][0].transcript;
        setTranscript(currentTranscript);

        // Clear any existing timeout
        if (speechTimeout) clearTimeout(speechTimeout);

        if (event.results[currentIndex].isFinal && currentTranscript.trim() !== '') {
          fetchGroqResponse(currentTranscript);
        } else if (currentTranscript.trim() !== '') {
          // 600ms ultra-fast VAD threshold without stopping the engine
          speechTimeout = setTimeout(() => {
            fetchGroqResponse(currentTranscript);
          }, 600);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          setTranscript("[Error: Microphone access denied. Please allow it in your browser settings.]");
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Ignore no-speech, let it auto-restart so it's truly unlimited
        } else if (event.error === 'network') {
          setTranscript("[Error: Network issue or Secure Context required (HTTPS)]");
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // If the mic dies natively, ALWAYS restart it to make it infinite
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch(e) {}
        }
      };

      recognitionRef.current = recognition;

      return () => {
        recognition.stop();
      };
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
      setTranscript("[Error: Speech Recognition not supported in this browser. Please use Chrome.]");
    }
  }, []);

  // Real-time hardware and network status tracking
  const [micPermissionState, setMicPermissionState] = useState('prompt'); 
  const [apiConnectionState, setApiConnectionState] = useState(true);

  // 1. Actively scan Microphone Hardware Permissions
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then((permissionStatus) => {
        setMicPermissionState(permissionStatus.state);
        // Listen for real-time changes if the user blocks/allows it in browser settings
        permissionStatus.onchange = () => {
          setMicPermissionState(permissionStatus.state);
        };
      }).catch(e => console.log(e));
    }
  }, []);

  // 2. Actively ping the Backend Server
  const checkApiConnection = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/status");
      if (res.ok) setApiConnectionState(true);
      else setApiConnectionState(false);
    } catch {
      setApiConnectionState(false);
    }
  };

  useEffect(() => {
    checkApiConnection(); // Initial ping
    const interval = setInterval(checkApiConnection, 10000); // Heartbeat every 10s
    return () => clearInterval(interval);
  }, []);

  const handleToggleListen = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        setTranscript("Initializing microphone...");
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to manually start recognition", e);
        setTranscript("[Failed to start. Please refresh the page.]");
      }
    }
  };

  return (
    <div className="App">
      <Navbar 
        blobColor={blobColor} setBlobColor={setBlobColor}
        blobSize={blobSize} setBlobSize={setBlobSize}
        blobSensitivity={blobSensitivity} setBlobSensitivity={setBlobSensitivity}
        isBlobDraggable={isBlobDraggable} setIsBlobDraggable={setIsBlobDraggable}
        isListening={isListening}
        micPermission={micPermissionState}
        apiConnection={apiConnectionState}
        onToggleListen={handleToggleListen}
        checkApiConnection={checkApiConnection}
      />
      
      <BlobParticles 
        color={blobColor}
        size={blobSize}
        sensitivity={blobSensitivity}
        position={blobPosition}
        setPosition={setBlobPosition}
        isDraggable={isBlobDraggable}
      />

      {/* Left Side: Vertical alignment with huge space in between for the Blob */}
      <div className="widget-absolute" style={{ top: '120px', left: '30px' }}>
        <LocationWidget location={location} />
      </div>

      <div className="widget-absolute" style={{ bottom: '120px', left: '30px' }}>
        <HardwareWidget />
      </div>

      {/* Right Side: Undisturbed alignment */}
      <div className="dashboard-sidebar right-sidebar">
        <SoftwareStatusWidget 
           isListening={isListening} 
           isProcessing={isProcessing} 
           apiConnection={apiConnectionState} 
           micPermission={micPermissionState} 
        />
        <TimeWeatherWidget location={location} />
      </div>

      <Terminal 
        transcript={transcript} 
        jarvisResponse={jarvisResponse}
        isListening={isListening} 
        isProcessing={isProcessing}
        onToggleListen={handleToggleListen} 
      />
      <div className="jarvis-hud">
        <div className="hud-ring outer-ring"></div>
        <div className="hud-ring middle-ring"></div>
        <div className="hud-ring inner-ring"></div>
        <div className="hud-core"></div>
        
        <div style={{ position: 'absolute', top: '110%', width: '400px' }}>
          <GreetingWidget />
        </div>

        {/* Subtle scanline overlay for the entire screen */}
        <div className="scanlines"></div>
      </div>
    </div>
  );
}

export default App;
