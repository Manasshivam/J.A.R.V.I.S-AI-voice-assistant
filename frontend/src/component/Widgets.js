import React, { useState, useEffect } from 'react';
import './Widgets.css';

// 1. Location Widget
export const LocationWidget = ({ location }) => {
  return (
    <div className="widget-container">
      <div className="widget-header">
        <span>Location</span>
        <div className="dot"></div>
      </div>
      <div className="widget-content">
        {location.loading ? (
          <div className="location-city">Locating...</div>
        ) : location.error ? (
          <div className="location-city" style={{color: '#ff003c'}}>GPS Offline</div>
        ) : (
          <>
            <div className="location-city">📍 {location.city}</div>
            <div className="location-country">{location.region}, {location.country}</div>
            <div className="location-coords">LAT: {location.lat?.toFixed(4)}° LNG: {location.lon?.toFixed(4)}°</div>
          </>
        )}
      </div>
    </div>
  );
};

// 2. Hardware Status Widget
export const HardwareWidget = () => {
  const [battery, setBattery] = useState({ level: 100, charging: false });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Battery
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        const updateBattery = () => setBattery({ level: Math.round(bat.level * 100), charging: bat.charging });
        updateBattery();
        bat.addEventListener('levelchange', updateBattery);
        bat.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }
    
    // Network
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="widget-container">
      <div className="widget-header">
        <span>System Status</span>
        <div className="dot"></div>
      </div>
      <div className="widget-content hardware-grid">
        <div className="hw-item">
          <span className="hw-label">Battery</span>
          <span className="hw-value" style={{color: battery.level <= 20 && !battery.charging ? '#ff003c' : '#fff'}}>
            {battery.charging ? '⚡' : '🔋'} {battery.level}%
          </span>
        </div>
        <div className="hw-item">
          <span className="hw-label">Network</span>
          <span className="hw-value" style={{color: isOnline ? '#fff' : '#ff003c'}}>
            {isOnline ? '📶 ONLINE' : '❌ OFFLINE'}
          </span>
        </div>
        <div className="hw-item">
          <span className="hw-label">Connection</span>
          <span className="hw-value">SECURE</span>
        </div>
        <div className="hw-item">
          <span className="hw-label">Bluetooth</span>
          <span className="hw-value" style={{color: '#00e5ff'}}>READY</span>
        </div>
      </div>
    </div>
  );
};

// 3. Software Status Widget
export const SoftwareStatusWidget = ({ isListening, isProcessing, apiConnection, micPermission }) => {
  return (
    <div className="widget-container">
      <div className="widget-header">
        <span>System Status</span>
        <div className="dot"></div>
      </div>
      <div className="widget-content status-list">
        <div className="status-item">
          <span>SYSTEM ONLINE</span>
          <div className="status-indicator active"></div>
        </div>
        <div className="status-item">
          <span>API CONNECTION</span>
          <div className={`status-indicator ${apiConnection ? 'active' : 'error'}`}></div>
        </div>
        <div className="status-item">
          <span>MIC PERMISSION</span>
          <div className={`status-indicator ${micPermission === 'granted' ? 'active' : (micPermission === 'denied' ? 'error' : '')}`}></div>
        </div>
        <div className="status-item">
          <span>J.A.R.V.I.S LISTENING</span>
          <div className={`status-indicator ${isListening ? 'active' : ''}`}></div>
        </div>
        <div className="status-item">
          <span>AI PROCESSING</span>
          <div className={`status-indicator ${isProcessing ? 'active' : ''}`}></div>
        </div>
      </div>
    </div>
  );
};

// 4. Time & Weather Widget
export const TimeWeatherWidget = ({ location }) => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '--', code: 0, loading: true });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (location.lat && location.lon && weather.loading) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current_weather=true`)
        .then(res => res.json())
        .then(data => {
          if (data.current_weather) {
            setWeather({
              temp: data.current_weather.temperature,
              code: data.current_weather.weathercode,
              loading: false
            });
          }
        })
        .catch(() => setWeather({ temp: '--', code: 0, loading: false }));
    }
  }, [location.lat, location.lon, weather.loading]);

  // Rough mapping of WMO weather codes to descriptions
  const getWeatherDesc = (code) => {
    if (code === 0) return 'CLEAR';
    if (code >= 1 && code <= 3) return 'PARTLY CLOUDY';
    if (code >= 45 && code <= 48) return 'FOG';
    if (code >= 51 && code <= 67) return 'RAIN';
    if (code >= 71 && code <= 77) return 'SNOW';
    if (code >= 95) return 'THUNDERSTORM';
    return 'UNKNOWN';
  };

  const pad = (num) => num.toString().padStart(2, '0');
  const hours = pad(time.getHours());
  const minutes = pad(time.getMinutes());
  const seconds = pad(time.getSeconds());
  
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  const dateStr = time.toLocaleDateString('en-US', options).toUpperCase();

  return (
    <div className="widget-container">
      <div className="widget-header">
        <span>System_Info</span>
        <div className="dot"></div>
      </div>
      <div className="widget-content">
        <div className="clock-time">{hours}:{minutes}<span style={{fontSize: '1rem', color: 'rgba(255,255,255,0.5)'}}>:{seconds}</span></div>
        <div className="clock-date">{dateStr}</div>
        
        <div className="weather-box">
          <div className="weather-desc">
            {location.city ? `📍 ${location.city}` : 'LOCATING...'}
            <br />
            {getWeatherDesc(weather.code)}
          </div>
          <div className="weather-temp">{weather.temp}°C</div>
        </div>
      </div>
    </div>
  );
};

// 5. Central Greeting Widget
export const GreetingWidget = () => {
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  if (hour >= 5 && hour < 12) greeting = 'Good Morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';

  return (
    <div className="greeting-widget">
      <div className="greeting-text">{greeting}, Manas</div>
      <div className="greeting-sub">All systems operational.</div>
      <div className="greeting-sub" style={{marginTop: '5px', letterSpacing: '2px', color: '#00e5ff'}}>- J.A.R.V.I.S. -</div>
    </div>
  );
};
