import React from 'react';
import './Terminal.css';

export default function Terminal({ transcript, jarvisResponse, isListening, isProcessing, onToggleListen }) {
  return (
    <div 
      className={`jarvis-terminal ${!isListening && !transcript ? 'inactive' : ''}`}
      onClick={onToggleListen}
      style={{ cursor: 'pointer' }}
      title="Click to toggle listening"
    >
      <div className="terminal-icon">🎙</div>
      <div className="terminal-text">
        <div className="user-text">
          <span className="label">[You]:</span> {transcript || (isListening ? 'Listening...' : 'System Idle - Click to Activate')}
          {isListening && !isProcessing && <span className="cursor"></span>}
        </div>
        {(jarvisResponse || isProcessing) && (
          <div className="jarvis-text">
            <span className="label">[J.A.R.V.I.S]:</span> {isProcessing ? 'Thinking...' : jarvisResponse}
            {isProcessing && <span className="cursor"></span>}
          </div>
        )}
      </div>
    </div>
  );
}
