"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  precision highp float;
  in vec3 position;
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 iResolution;
  uniform float iTime;

  uniform int u_renderPasses;
  uniform float u_sceneTimeScale;
  uniform float u_grainIntensity;
  uniform float u_globalLuminance;
  uniform float u_stepPrecision;
  uniform float u_rayIterations;
  uniform float u_surfaceSolidity;

  uniform float u_camPosX;
  uniform float u_camPosY;
  uniform float u_camPitch;
  uniform float u_camFov;
  uniform float u_camShiftX;
  uniform float u_camShiftY;

  out vec4 fragColor;

  float hashNoise(vec2 seedPos) {
    return fract(sin(dot(seedPos, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  mat2 createRotationMatrix(float angleRad) {
    float c = cos(angleRad);
    float s = sin(angleRad);
    return mat2(c, -s, s, c);
  }

  float computeStructuralDensity(vec3 samplePos) {
    samplePos.xz *= createRotationMatrix(samplePos.y * 0.4);
    vec3 localPos = samplePos;
    
    vec3 cellIndex = floor(samplePos);
    samplePos = fract(samplePos) - 0.5;
    samplePos.xz *= createRotationMatrix(iTime * u_sceneTimeScale);
    
    float sphereDistance = length(samplePos) - 0.15;
    
    vec3 boxVector = abs(samplePos) - vec3(0.12);
    float boxDistance = length(max(boxVector, 0.0)) + min(max(boxVector.x, max(boxVector.y, boxVector.z)), 0.0);
    
    float rawShape = mix(sphereDistance, boxDistance, 0.5 + 0.5 * sin(iTime * 0.5 + cellIndex.x));
    
    float groundWave = sin(localPos.x * 0.8) * cos(localPos.z * 0.8) * 0.5;
    float planeDistance = localPos.y + 1.5 + groundWave;
    
    return min(rawShape, planeDistance);
  }

  vec3 applyCinematicGrade(vec3 baseColor) {
    baseColor = clamp(baseColor, 0.0, 1.0);
    vec3 gradedColor = pow(baseColor, vec3(0.85, 0.9, 0.95));
    float vignette = 1.0 - 0.3 * length((gl_FragCoord.xy / iResolution.xy) - 0.5);
    return gradedColor * vignette;
  }

  void main() {
    vec3 finalImage = vec3(0.0);
    vec2 normalizedCoord = gl_FragCoord.xy / iResolution.xy;
    
    float activeGrain = (hashNoise(gl_FragCoord.xy + iTime) - 0.5) * u_grainIntensity;

    for (int passY = 0; passY < u_renderPasses; passY++) {
      for (int passX = 0; passX < u_renderPasses; passX++) {
        vec2 subPixelOffset = (vec2(float(passX), float(passY)) / float(u_renderPasses)) - 0.5;
        vec2 rayTarget = (gl_FragCoord.xy + subPixelOffset - 0.5 * iResolution.xy) / iResolution.y;

        vec3 rayOrigin = vec3(u_camPosX, u_camPosY, -3.0);
        vec3 rayDirection = normalize(vec3(rayTarget * u_camFov, 1.0));

        rayDirection.yz *= createRotationMatrix(u_camPitch);
        rayDirection.xz *= createRotationMatrix(iTime * 0.05);

        vec3 viewDir = rayDirection;
        vec3 lightAccumulator = vec3(0.0);
        float stepDistance = 0.0;

        for (float iter = 0.0; iter < u_rayIterations; iter++) {
          vec3 samplePos = rayOrigin;
          
          float detailNoise = computeStructuralDensity(samplePos * 20.0) / 20.0;
          float baseNoise = computeStructuralDensity(samplePos);
          
          stepDistance = 0.005 + abs(detailNoise - baseNoise) * 0.7;
          
          float heightMod = sin(samplePos.z * 2.0 + abs(samplePos.x) * 0.5) * 0.5;
          stepDistance += abs(rayOrigin.y + heightMod) * 0.4;
          
          float safeStep = stepDistance * u_stepPrecision;
          rayOrigin += viewDir * safeStep;
          
          float colorPhase = (iter * u_stepPrecision) - 0.4;
          float wavePhase = colorPhase + length(rayOrigin.xz * 0.1) + 2.0;
          vec3 spectrumShift = vec3(3.0, 1.5, 0.5);
          vec3 spectralGlow = 1.0 + 1.5 * sin(wavePhase + spectrumShift);
          
          float rawDensity = 1.0 / stepDistance;
          float sharpDensity = pow(rawDensity, u_surfaceSolidity) * 0.15; 
          
          lightAccumulator += (spectralGlow * sharpDensity) * u_stepPrecision;
        }
        
        lightAccumulator *= u_globalLuminance;
        finalImage += applyCinematicGrade(lightAccumulator * lightAccumulator / 1000.0);
      }
    }
    
    finalImage *= (4.0 / float(u_renderPasses * u_renderPasses));
    finalImage = (finalImage - 0.5) * 0.5 + 0.5;
    finalImage += activeGrain;

    fragColor = vec4(clamp(finalImage, 0.0, 1.0), 1.0);
  }
`;

export default function HeroShader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Capped Pixel Ratio for smooth 60fps performance across mobile & 4K displays
    const isMobile = window.innerWidth < 768;
    const maxDpr = isMobile ? 0.85 : 1.0;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const params = {
      passes: 1,
      speed: 0.6,
      grain: 0.035,
      luminance: 4.8,
      precision: 0.5,
      iterations: isMobile ? 18.0 : 22.0, // Reduced iterations on mobile
      solidity: 1.1,
      camX: 2.8,
      camY: -1.0,
      camPitch: -0.38,
      camFov: 2.5,
      camShiftX: 1.0,
      camShiftY: 1.0,
    };

    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader,
      uniforms: {
        iResolution: { value: new THREE.Vector3() },
        iTime: { value: 0.0 },
        u_renderPasses: { value: params.passes },
        u_sceneTimeScale: { value: params.speed },
        u_grainIntensity: { value: params.grain },
        u_globalLuminance: { value: params.luminance },
        u_stepPrecision: { value: params.precision },
        u_rayIterations: { value: params.iterations },
        u_surfaceSolidity: { value: params.solidity },
        u_camPosX: { value: params.camX },
        u_camPosY: { value: params.camY },
        u_camPitch: { value: params.camPitch },
        u_camFov: { value: params.camFov },
        u_camShiftX: { value: params.camShiftX },
        u_camShiftY: { value: params.camShiftY },
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      renderer.setSize(width, height);

      const dpr = renderer.getPixelRatio();
      material.uniforms.iResolution.value.set(width * dpr, height * dpr, 1.0);
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();

    const clock = new THREE.Clock();
    let animId: number;
    let isVisible = true;
    let lastFrameTime = 0;

    // IntersectionObserver to pause rendering when scrolled out of view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const animate = (timestamp: number) => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return; // Skip rendering when Hero is offscreen!

      // Throttle to 60 FPS max
      if (timestamp - lastFrameTime < 14) return;
      lastFrameTime = timestamp;

      material.uniforms.iTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          opacity: 0.85,
        }}
      />
      {/* Dark gradient overlay for text contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(14, 14, 14, 0.4) 0%, rgba(14, 14, 14, 0.88) 100%)",
        }}
      />
    </div>
  );
}
