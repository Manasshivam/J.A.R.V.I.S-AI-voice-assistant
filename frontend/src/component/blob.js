import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';

export default function BlobParticles({ color, size, sensitivity, position, setPosition, isDraggable }) {
  const containerRef = useRef(null);
  const reqRef = useRef(null);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Mic reactivity state
  const mic = useRef({
    audioContext: null,
    analyser: null,
    source: null,
    dataArray: null,
    smoothedLevel: 0
  });

  const uniforms = useMemo(() => ({
    time: { value: 1.0 },
    resolution: { value: new THREE.Vector2() },
    blobColor: { value: new THREE.Color(color) },
    micLevel: { value: 0.0 }
  }), []);

  const particlesRef = useRef(null);

  // Initialize Microphone
  useEffect(() => {
    let streamRef = null;

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef = stream;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Browsers block audio context until user interaction. We must resume it.
        const resumeAudio = () => {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('touchstart', resumeAudio);

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        mic.current = {
          audioContext: audioCtx,
          analyser: analyser,
          source: source,
          dataArray: dataArray,
          smoothedLevel: 0
        };
      } catch (err) {
        console.error("Microphone access denied or not available", err);
      }
    };

    initMic();

    return () => {
      window.removeEventListener('click', () => {});
      window.removeEventListener('touchstart', () => {});
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
      if (mic.current.audioContext) {
        mic.current.audioContext.close();
      }
    };
  }, []);

  // Update color when prop changes
  useEffect(() => {
    uniforms.blobColor.value.set(color);
  }, [color, uniforms]);

  const vertexShader = `
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

    float cnoise(vec2 P) {
      vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
      vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
      Pi = mod289(Pi);
      vec4 ix = Pi.xzxz;
      vec4 iy = Pi.yyww;
      vec4 fx = Pf.xzxz;
      vec4 fy = Pf.yyww;

      vec4 i = permute(permute(ix) + iy);

      vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
      vec4 gy = abs(gx) - 0.5 ;
      vec4 tx = floor(gx + 0.5);
      gx = gx - tx;

      vec2 g00 = vec2(gx.x,gy.x);
      vec2 g10 = vec2(gx.y,gy.y);
      vec2 g01 = vec2(gx.z,gy.z);
      vec2 g11 = vec2(gx.w,gy.w);

      vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
      g00 *= norm.x;
      g01 *= norm.y;
      g10 *= norm.z;
      g11 *= norm.w;

      float n00 = dot(g00, vec2(fx.x, fy.x));
      float n10 = dot(g10, vec2(fx.y, fy.y));
      float n01 = dot(g01, vec2(fx.z, fy.z));
      float n11 = dot(g11, vec2(fx.w, fy.w));

      vec2 fade_xy = fade(Pf.xy);
      vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
      float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
      return 2.3 * n_xy;
    }

    float map(float value, float oldMin, float oldMax, float newMin, float newMax) {
        return newMin + (newMax - newMin) * (value - oldMin) / (oldMax - oldMin);
    }

    varying vec3 vUv;
    varying float vTime;
    varying float vZ;
    uniform float time;
    uniform float micLevel;
    
    void main() {
        vUv = position;
        vTime = time;
        vec3 newPos = position;
        vec2 peak = vec2(1.0 - abs(.5 - uv.x), 1.0 - abs(.5 - uv.y));
        
        // Speed up the noise a bit when speaking
        float speed = 0.3 + (micLevel * 0.5);
        vec2 noise = vec2(
            map(cnoise(vec2(speed * time + uv.x * 5., uv.y * 5.)), 0., 1., -2., (peak.x * peak.y * 30.)),
            map(cnoise(vec2(-speed * time + uv.x * 5., uv.y * 5.)), 0., 1., -2., 25.)
        );

        // Increase displacement spiking based on mic volume
        float intensity = 0.06 + (micLevel * 0.2);
        newPos.z += noise.x * intensity * noise.y;
        
        vZ = newPos.z;
        vec4 mvPosition = modelViewMatrix * vec4( newPos, 1.0 );
        gl_PointSize = 10.0;
        gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vUv;
    varying float vTime;
    varying float vZ;
    uniform vec3 blobColor;

    float map(float value, float oldMin, float oldMax, float newMin, float newMax) {
        return newMin + (newMax - newMin) * (value - oldMin) / (oldMax - oldMin);
    }

    void main() {
        float alpha = map(vZ / 2., -1. / 2., 30. / 2., 0.17, 1.); 

        // Procedural soft circle particle
        vec2 pt = gl_PointCoord - vec2(0.5);
        if(length(pt) > 0.5) discard;
        float softEdge = smoothstep(0.5, 0.1, length(pt));

        gl_FragColor = vec4(blobColor, alpha * softEdge);
    }
  `;

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(40, w / h, 1, 2000);
    camera.position.z = 200;
    camera.position.y = -70;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    containerRef.current.appendChild(renderer.domElement);

    const plane = new THREE.SphereGeometry(50, 102, 52); 

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    const particles = new THREE.Points(plane, material);
    particles.rotation.x = 0;
    particlesRef.current = particles;

    scene.add(particles);

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.resolution.value.set(w, h);
    };

    window.addEventListener('resize', onResize);

    const animate = () => {
      reqRef.current = requestAnimationFrame(animate);
      uniforms.time.value += 0.03;
      
      // Calculate microphone reactivity
      if (mic.current && mic.current.analyser) {
        mic.current.analyser.getByteFrequencyData(mic.current.dataArray);
        let sum = 0;
        for (let i = 0; i < mic.current.dataArray.length; i++) {
          sum += mic.current.dataArray[i];
        }
        let avg = sum / mic.current.dataArray.length;
        let rawLevel = avg / 255.0; // Normalized 0 to 1
        
        // Noise gate: cut out true background noise BEFORE sensitivity is applied
        // Lowered to 1% to allow J.A.R.V.I.S to detect whispers and low pitches
        if (rawLevel < 0.01) {
          rawLevel = 0;
        } else {
          // Normalize the remaining volume range
          rawLevel = (rawLevel - 0.01) * 1.01;
        }
        
        // Apply sensitivity to the noise-gated raw level, with a massive hidden 4x multiplier
        // to guarantee it reacts to low pitch and quiet voices visually.
        const finalSensitivity = sensitivity * 4.0;
        let targetScale = 1 + (rawLevel * finalSensitivity * 2);

        // Apply a power curve to make actual speech "pop" and look much more responsive
        let boostedLevel = rawLevel * finalSensitivity;
        boostedLevel = Math.pow(boostedLevel, 0.6); 

        // Smooth the level so it feels fluid
        mic.current.smoothedLevel += (boostedLevel - mic.current.smoothedLevel) * 0.2;
        
        const finalLevel = Math.min(1.0, Math.max(0.0, mic.current.smoothedLevel));
        uniforms.micLevel.value = finalLevel;
        
        // Dynamically scale the particle mesh based on base size + mic volume
        if (particlesRef.current) {
          const dynamicSize = size + (finalLevel * size * 0.6); 
          particlesRef.current.scale.set(dynamicSize, dynamicSize, dynamicSize);
        }
      } else {
        // If no mic, just use the static base size
        if (particlesRef.current) {
          particlesRef.current.scale.set(size, size, size);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      plane.dispose();
      material.dispose();
    };
  }, [vertexShader, fragmentShader, uniforms, size, sensitivity]);

  // Dragging event handlers
  const handleMouseDown = (e) => {
    if (!isDraggable) return;
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDraggable || !isDragging) return;
    
    setPosition({
      left: e.clientX - dragOffset.x,
      top: e.clientY - dragOffset.y,
      bottom: 'auto',
      right: 'auto'
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Define dynamic styles based on props
  const dynamicStyles = {
    width: "400px", 
    height: "400px", 
    position: "fixed", 
    zIndex: 1,
    background: isDraggable ? "rgba(0, 229, 255, 0.1)" : "transparent",
    border: isDraggable ? "2px dashed #00e5ff" : "none",
    borderRadius: "50%",
    pointerEvents: isDraggable ? "auto" : "none",
    cursor: isDraggable ? (isDragging ? "grabbing" : "grab") : "default",
    ...position
  };

  return (
    <div 
      style={dynamicStyles}
      onMouseDown={handleMouseDown}
    >
      <div 
        ref={containerRef} 
        style={{ width: "100%", height: "100%", margin: 0, padding: 0 }} 
      />
    </div>
  );
}
