import React, { useState } from 'react';
import './Navbar.css';

export default function Navbar({ 
  blobColor, setBlobColor, blobSize, setBlobSize, blobSensitivity, setBlobSensitivity, isBlobDraggable, setIsBlobDraggable,
  isListening, micPermission, apiConnection, onToggleListen, checkApiConnection 
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  return (
    <nav className="jarvis-navbar">
      <div className="navbar-logo">
        <span className="logo-icon">❖</span>
        <span className="logo-text">J.A.R.V.I.S</span>
      </div>
      <ul className="navbar-links">
        <li><a href="#dashboard">Dashboard</a></li>
        <li><a href="#modules">Modules</a></li>
        <li className="settings-menu-container">
          <a href="#settings" onClick={(e) => { e.preventDefault(); setShowSettings(!showSettings); setShowStatus(false); }}>Settings</a>
          {showSettings && (
            <div className="settings-dropdown">
              <div className="settings-section">
                <h4>Blob Settings</h4>
                <div className="setting-item">
                  <label>Color</label>
                  <input type="color" value={blobColor} onChange={(e) => setBlobColor(e.target.value)} />
                </div>
                <div className="setting-item">
                  <label>Size</label>
                  <input type="range" min="0.5" max="3" step="0.1" value={blobSize} onChange={(e) => setBlobSize(parseFloat(e.target.value))} />
                </div>
                <div className="setting-item">
                  <label>Sensitivity</label>
                  <input type="range" min="0" max="5" step="0.1" value={blobSensitivity} onChange={(e) => setBlobSensitivity(parseFloat(e.target.value))} />
                </div>
                <div className="setting-item btn-row">
                  {!isBlobDraggable ? (
                    <button className="jarvis-btn" onClick={() => setIsBlobDraggable(true)}>Reposition Blob</button>
                  ) : (
                    <button className="jarvis-btn active" onClick={() => setIsBlobDraggable(false)}>Save Position</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </li>
        <li className="settings-menu-container">
          <a href="#system" onClick={(e) => { e.preventDefault(); setShowStatus(!showStatus); setShowSettings(false); }}>System Status</a>
          {showStatus && (
            <div className="settings-dropdown status-dropdown">
              <div className="settings-section">
                <h4>System Status</h4>
                <div className="status-item">
                  <span>SYSTEM ONLINE</span>
                  <div className="status-dot green"></div>
                </div>
                <div className="status-item">
                  <span>J.A.R.V.I.S. ACTIVE</span>
                  <div className="status-dot green"></div>
                </div>
                <div className="status-item" onClick={onToggleListen} style={{cursor: 'pointer'}} title="Click to manually toggle microphone">
                  <span>MICROPHONE</span>
                  <div className={`status-dot ${isListening ? 'green' : 'grey'}`}></div>
                </div>
                <div className="status-item" style={{cursor: 'default'}} title={`Current Status: ${micPermission}`}>
                  <span>MIC PERMISSION</span>
                  <div className={`status-dot ${micPermission === 'granted' ? 'green' : micPermission === 'denied' ? 'red' : 'grey'}`}></div>
                </div>
                <div className="status-item" onClick={() => { checkApiConnection(); setShowStatus(true); }} style={{cursor: 'pointer'}} title="Click to ping backend server">
                  <span>API CONNECTION</span>
                  <div className={`status-dot ${apiConnection ? 'green' : 'red'}`}></div>
                </div>
              </div>
            </div>
          )}
        </li>
      </ul>
      <div className="navbar-profile">
        <div className="status-indicator"></div>
        <span>Online</span>
      </div>
    </nav>
  );
}
