import React from 'react';
import { Mic, Activity, Loader2, Volume2 } from 'lucide-react';
import '../index.css'; // ensure it pulls from the parent directory styles

const JarvisCore = ({ status }) => {
  let coreClass = 'core-idle';
  let IconComponent = Activity;
  let statusText = 'SYSTEM IDLE';

  switch (status) {
    case 'listening':
      coreClass = 'core-listening';
      IconComponent = Mic;
      statusText = 'LISTENING...';
      break;
    case 'thinking':
      coreClass = 'core-thinking';
      IconComponent = Loader2;
      statusText = 'PROCESSING...';
      break;
    case 'speaking':
      coreClass = 'core-speaking';
      IconComponent = Volume2;
      statusText = 'TRANSMITTING...';
      break;
    default:
      coreClass = 'core-idle';
      IconComponent = Activity;
      statusText = 'SYSTEM IDLE';
      break;
  }

  return (
    <div style={styles.container}>
      {/* Outer Rotating Rings */}
      <div style={{...styles.ring, ...styles.ring1, animation: status === 'thinking' ? 'pulse-thinking 2s infinite linear' : 'none'}} />
      <div style={{...styles.ring, ...styles.ring2, animation: status === 'speaking' ? 'pulse-idle 0.5s infinite alternate' : 'none'}} />
      
      {/* The Main Glowing Orb */}
      <div style={styles.orbWrapper}>
        <div className={coreClass} style={styles.orb}>
          <IconComponent size={48} color="#00d2ff" style={{ opacity: 0.8 }} />
        </div>
      </div>

      <div style={styles.statusDisplay}>
        <h2 style={styles.statusText}>{statusText}</h2>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '400px',
    width: '400px',
  },
  ring: {
    position: 'absolute',
    borderRadius: '50%',
    border: '2px solid rgba(0, 210, 255, 0.15)',
    boxSizing: 'border-box',
    pointerEvents: 'none',
  },
  ring1: {
    width: '320px',
    height: '320px',
    borderTopColor: 'rgba(0, 210, 255, 0.8)',
    borderBottomColor: 'rgba(0, 210, 255, 0.8)',
  },
  ring2: {
    width: '360px',
    height: '360px',
    borderLeftColor: 'rgba(180, 0, 255, 0.6)',
    borderRightColor: 'rgba(180, 0, 255, 0.6)',
  },
  orbWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  orb: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 20, 40, 0.8)',
    border: '4px solid #00d2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  statusDisplay: {
    position: 'absolute',
    bottom: '-40px',
    textAlign: 'center',
  },
  statusText: {
    fontFamily: 'Orbitron, sans-serif',
    color: '#00d2ff',
    letterSpacing: '4px',
    fontSize: '18px',
    textShadow: '0 0 10px rgba(0, 210, 255, 0.8)',
    margin: 0,
  }
};

export default JarvisCore;
