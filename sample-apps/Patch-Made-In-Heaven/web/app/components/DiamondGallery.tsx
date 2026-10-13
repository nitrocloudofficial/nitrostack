"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import gsap from "gsap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import {
  Settings,
  X,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  ListFilter,
  Code2,
  KeyRound,
  Type,
  AlertCircle,
  CheckCircle2,
  FileCode2,
  SlidersHorizontal,
} from "lucide-react";

export interface ToolItem {
  num: string;
  name: string;
  tag: string;
  desc: string;
  schema?: Record<string, any>;
}

interface Props {
  tools: ToolItem[];
  onSelectTool?: (tool: ToolItem) => void;
}

// ── Draw Card Canvas Texture (Optimized 600x600 size for fast GPU uploads) ──
function createToolCardTexture(tool: ToolItem): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;

  // Deep Obsidian High-Contrast Background
  const bg = ctx.createLinearGradient(0, 0, 600, 600);
  bg.addColorStop(0, "#1a1a1a");
  bg.addColorStop(0.4, "#0f0f0f");
  bg.addColorStop(1, "#030303");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 600, 600);

  // Crisp Linear Grid Overlay
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 600; i += 45) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 225, 600);
    ctx.stroke();
  }

  // Sharp Inner Silver Border Frame
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 2.2;
  ctx.strokeRect(20, 20, 560, 560);

  // Number Badge (#ffffff White)
  ctx.font = '700 32px "Geist Mono", "JetBrains Mono", monospace';
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`/ ${tool.num}`, 50, 80);

  // Tool Title (Syne Display Font, #ffffff Crisp White)
  ctx.font = '800 48px "Syne", system-ui, sans-serif';
  ctx.fillStyle = "#ffffff";

  const titleWords = tool.name.split("_");
  let y = 195;
  for (const word of titleWords) {
    ctx.fillText(word, 50, y);
    y += 54;
  }

  // White Accent Line
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(50, y + 8, 95, 3.5);

  // Description (DM Sans Body Font, #e4e4e7 High-Contrast Light Gray)
  y += 54;
  ctx.font = '400 23px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = "#e4e4e7";

  const words = tool.desc.split(" ");
  let line = "";
  const maxWidth = 500;
  const lineHeight = 34;

  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== "") {
      ctx.fillText(line, 50, y);
      line = word + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 50, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// ── Shaders ──────────────────────────────────────────────────────────────────
const cardVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vBitangent;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vTangent = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
    vBitangent = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const cardFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uHolo;
  uniform float uFocus;
  uniform float uOpen;
  uniform float uFacetScale;
  uniform float uFacetStrength;
  uniform float uSeed;
  uniform vec2 uPointer;
  uniform float uTheta;
  uniform float uMotion;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vBitangent;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  vec2 hash2(vec2 p) {
    return fract(sin(vec2(
      dot(p, vec2(127.1, 311.7)),
      dot(p, vec2(269.5, 183.3))
    )) * 43758.5453);
  }

  vec3 cosPalette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }

  vec3 diamondPalette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  vec3 voronoi(vec2 g, out vec2 cellId) {
    vec2 ci = floor(g);
    vec2 cf = fract(g);
    float F1 = 8.0;
    float F2 = 8.0;
    cellId = vec2(0.0);
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 n = vec2(float(x), float(y));
        vec2 p = hash2(ci + n);
        float d = length(n + p - cf);
        if (d < F1) { F2 = F1; F1 = d; cellId = ci + n; }
        else if (d < F2) { F2 = d; }
      }
    }
    return vec3(F1, F2, F2 - F1);
  }

  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 N = normalize(vNormal);
    bool backFace = !gl_FrontFacing;
    if (backFace) N = -N;

    mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
    vec2 suv = rot * vUv;
    vec2 cellId;
    vec3 vor = voronoi(suv * uFacetScale * vec2(1.0, 0.75) + uSeed, cellId);
    vec2 cellId2;
    vec3 vor2 = voronoi(suv * uFacetScale * vec2(2.1, 1.6) + 13.7 + uSeed, cellId2);

    vec2 rnd = hash2(cellId + 7.3) - 0.5;
    float dynamicFacetStrength = uFacetStrength * (1.0 - 0.9 * uOpen);
    vec3 Nf = normalize(N + (rnd.x * vTangent + rnd.y * vBitangent) * dynamicFacetStrength);

    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    float holo = uHolo * mix(0.55 + 0.45 * uFocus, 0.25, uOpen);
    holo *= 1.0 + uMotion * (0.5 + 1.2 * uFocus);

    float centerMask = smoothstep(0.12, 0.52, length(vUv - 0.5));
    holo *= mix(0.4, 1.0, centerMask);

    float cycle = fract(uTime * 0.32);
    float diag = (1.0 - vUv.y) * 0.72 + vUv.x * 0.28;
    float sweepPos = cycle * 3.4 - 1.2;
    float sweepD = abs(diag - sweepPos);
    float sweep = exp(-pow(sweepD * 7.0, 2.0));
    float sweepCore = exp(-pow(sweepD * 18.0, 2.0));
    float sweepFringe = max(sweep - sweepCore, 0.0);

    float facing = pow(max(dot(N, V), 0.0), 3.0);
    float bandBase = dot(V, Nf) + sweep * 0.45 + uTheta * (1.2 + 2.4 * facing);
    float band = bandBase + dot(uPointer, rnd * 2.0) * 0.55 * uFocus;
    float n1 = noise(vUv * 3.0 + uSeed + uTime * 0.09);
    float n2 = noise(vUv * 4.5 + uSeed - uTime * 0.075 + n1 * 1.8);
    float flow = n1 + n2;
    float hue = flow * 0.85 + band * 1.9 + hash(cellId) * 0.25 + uTime * 0.03;
    vec3 iri = cosPalette(hue);
    iri = mix(iri, diamondPalette(hue), sweep * 0.6);
    iri = mix(vec3(1.0), iri, 0.55);

    float liquid = pow(0.5 + 0.5 * sin(flow * 4.0 + bandBase * 9.0 + uTime * 0.4), 2.0);
    float gleam = pow(0.5 + 0.5 * sin(hash(cellId) * 6.28318 + bandBase * 6.0 + uTime * 0.12), 3.0) * mix(1.0, 0.25, uOpen);
    float gleam2 = pow(0.5 + 0.5 * sin(hash(cellId2) * 6.28318 - bandBase * 5.0 + uTime * 0.09), 4.0) * mix(1.0, 0.25, uOpen);

    float fw = 0.028;
    vec2 edge = min(vUv, 1.0 - vUv);
    float edgeD = min(edge.x, edge.y);
    float frame = 1.0 - smoothstep(fw, fw + 0.004, edgeD);
    float bevel = 0.5 + 0.5 * cos((edgeD / fw) * 6.28318);

    vec3 image = texture2D(uMap, vUv).rgb;

    float luma = dot(image, vec3(0.299, 0.587, 0.114));
    image = mix(vec3(luma), image, 1.1);
    image = clamp(mix(vec3(0.5), image, 1.07), 0.0, 1.0);

    vec3 L = normalize(vec3(0.4, 0.7, 0.6));
    float glass = pow(max(dot(reflect(-L, Nf), V), 0.0), 22.0);

    if (backFace) {
      image = vec3(0.04, 0.04, 0.04) + iri * 0.1;
    }

    float focusHoloDampen = (1.0 - 0.45 * uFocus);
    float focusImageBoost = 1.05 + 0.5 * uFocus;

    vec3 crystal = mix(iri, vec3(0.9, 0.9, 0.9), 0.5);
    vec3 iceGleam = mix(iri, vec3(0.8, 0.8, 0.8), 0.45);
    vec3 imgTint = 0.25 + 0.75 * image;
    vec3 iriChroma = iri - dot(iri, vec3(0.299, 0.587, 0.114));
    vec3 color = image * focusImageBoost
               + iriChroma * liquid * (0.15 + 0.15 * sweep) * holo * focusHoloDampen
               + iri * liquid * (0.03 + 0.03 * sweep) * holo * focusHoloDampen
               + iceGleam * imgTint * gleam * (0.08 + 0.12 * sweep) * holo * focusHoloDampen
               + iceGleam * imgTint * gleam2 * (0.04 + 0.08 * sweep) * holo * focusHoloDampen
               + crystal * glass * (0.12 + 0.2 * sweep) * holo
               + iri * fres * (0.12 + 0.08 * sweep) * holo;

    vec2 pUv = uPointer * 0.5 + 0.5;
    float sheen = exp(-dot(vUv - pUv, vUv - pUv) * 6.0) * uFocus * (1.0 - uOpen);
    color += crystal * sheen * 0.15;

    float metalSheen = pow(0.5 + 0.5 * sin((vUv.x - vUv.y) * 5.0 + bandBase * 3.0 + uTime * 0.3), 8.0);
    vec3 silver = mix(vec3(0.3, 0.3, 0.3), vec3(0.95, 0.95, 0.95), bevel);
    silver *= 0.88 + 0.35 * fres;
    silver += iri * metalSheen * 0.9;
    silver += iri * 0.07;
    silver += vec3(0.95, 0.95, 0.95) * sweepCore * 0.45 * holo;
    silver += iri * sweepFringe * 0.15 * holo;
    silver += crystal * sheen * 0.25;
    color = mix(color, silver, frame * 0.95);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const flatVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export default function DiamondGallery({ tools, onSelectTool }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalOverlayRef = useRef<HTMLDivElement>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedTool, setExpandedTool] = useState<ToolItem | null>(null);
  const [openProgress, setOpenProgress] = useState(0);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [suppressCardControls, setSuppressCardControls] = useState(false);
  const showSchemaModalRef = useRef(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<"params" | "schema">("params");

  useEffect(() => {
    showSchemaModalRef.current = showSchemaModal;
  }, [showSchemaModal]);

  const openSchemaModal = () => {
    setShowSchemaModal(true);
  };

  const stopCarouselPointerEvent = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const closeSchemaModal = () => {
    setSuppressCardControls(true);
    if (modalOverlayRef.current && modalCardRef.current) {
      gsap.to(modalOverlayRef.current, {
        opacity: 0,
        duration: 0.55,
        ease: "power2.in",
      });
      gsap.to(modalCardRef.current, {
        opacity: 0,
        scale: 0.92,
        y: 16,
        duration: 0.55,
        ease: "power2.in",
        onComplete: () => stateRef.current.closeCard(),
      });
    } else {
      stateRef.current.closeCard();
    }
  };

  useEffect(() => {
    if (showSchemaModal && modalOverlayRef.current && modalCardRef.current) {
      gsap.fromTo(
        modalOverlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.65, ease: "power2.out" }
      );
      gsap.fromTo(
        modalCardRef.current,
        { opacity: 0, scale: 0.88, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.2)" }
      );
    }
  }, [showSchemaModal]);

  // Lock background page scroll whenever a card is expanded — inside the card/modal still scrolls
  useEffect(() => {
    if (!expandedTool) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [expandedTool]);

  // Dynamic screen bounds for interactive overlay tracking
  const [cardScreenBounds, setCardScreenBounds] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const stateRef = useRef({
    theta: 0,
    velocity: 0,
    dragging: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    state: "closed",
    openProgressVal: 0,
    openedCard: null as THREE.Mesh | null,
    currentFront: null as THREE.Mesh | null,
    stepCard: (_dir: number) => {},
    goToCard: (_idx: number) => {},
    openFrontCard: () => {},
    openCard: (_card: THREE.Mesh) => {},
    closeCard: () => {},
  });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const CARD_COUNT = tools.length;
    const RADIUS = 4.3;
    const CARD_HEIGHT = 2.7;
    const CAMERA_Z = 11;
    const OPEN_DISTANCE = 5;

    const isMobile = window.innerWidth < 768;

    const params = {
      bloomStrength: 0.08,
      bloomRadius: 0.3,
      bloomThreshold: 0.88,
      holo: 1.0,
      facetScale: 18.0,
      facetStrength: 0.3,
      aberration: 0.001,
      floorReflect: 0.5,
      floorGlow: 0.55,
    };

    // Scene setup - Pure Black background matching --bg-app (#000000)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, CAMERA_Z);
    camera.lookAt(0, 0, 0);

    const fitCameraDistance = () => {
      camera.position.z = camera.aspect < 0.75 ? 15 : CAMERA_Z;
    };
    fitCameraDistance();

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Load custom textures for tools
    const textures = tools.map((t) => createToolCardTexture(t));

    // Carousel Group
    const carousel = new THREE.Group();
    scene.add(carousel);

    const cardGeometry = new THREE.PlaneGeometry(CARD_HEIGHT, CARD_HEIGHT);
    const cards: THREE.Mesh[] = [];
    const pointerSmooth = new THREE.Vector2();
    const overlayCorner = new THREE.Vector3();
    const overlayCorners = [
      new THREE.Vector3(-CARD_HEIGHT / 2, -CARD_HEIGHT / 2, 0),
      new THREE.Vector3(CARD_HEIGHT / 2, -CARD_HEIGHT / 2, 0),
      new THREE.Vector3(-CARD_HEIGHT / 2, CARD_HEIGHT / 2, 0),
      new THREE.Vector3(CARD_HEIGHT / 2, CARD_HEIGHT / 2, 0),
    ];

    for (let i = 0; i < CARD_COUNT; i++) {
      const angle = (i / CARD_COUNT) * Math.PI * 2;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: textures[i] },
          uTime: { value: 0 },
          uHolo: { value: params.holo },
          uFocus: { value: 0 },
          uOpen: { value: 0 },
          uFacetScale: { value: params.facetScale },
          uFacetStrength: { value: params.facetStrength },
          uSeed: { value: Math.random() * 100 },
          uPointer: { value: pointerSmooth },
          uTheta: { value: 0 },
          uMotion: { value: 0 },
        },
        vertexShader: cardVertexShader,
        fragmentShader: cardFragmentShader,
        side: THREE.DoubleSide,
      });

      const card = new THREE.Mesh(cardGeometry, material);
      card.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
      card.rotation.y = angle;
      card.userData = {
        index: i,
        tool: tools[i],
        angle,
        phase: Math.random() * Math.PI * 2,
        basePos: card.position.clone(),
        focus: 0,
      };
      carousel.add(card);
      cards.push(card);
    }

    // Platform Reflector floor
    const FLOOR_Y = -1.62;
    const FLOOR_R = 5.6;

    const mirror = new Reflector(new THREE.CircleGeometry(FLOOR_R, isMobile ? 48 : 72), {
      clipBias: 0.003,
      textureWidth: isMobile ? 512 : 1024,
      textureHeight: isMobile ? 512 : 1024,
      color: 0x121212,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = FLOOR_Y;
    scene.add(mirror);

    const floorFade = new THREE.Mesh(
      new THREE.CircleGeometry(FLOOR_R + 0.05, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uStrength: { value: params.floorReflect } },
        vertexShader: flatVertexShader,
        fragmentShader: /* glsl */ `
          uniform float uStrength;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float fade = smoothstep(0.12, 0.85, d);
            float alpha = 1.0 - uStrength * (1.0 - fade);
            gl_FragColor = vec4(vec3(0.0), alpha);
          }
        `,
      })
    );
    floorFade.rotation.x = -Math.PI / 2;
    floorFade.position.y = FLOOR_Y + 0.005;
    scene.add(floorFade);

    const floorRing = new THREE.Mesh(
      new THREE.CircleGeometry(FLOOR_R + 0.35, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uGlow: { value: params.floorGlow } },
        vertexShader: flatVertexShader,
        fragmentShader: /* glsl */ `
          uniform float uGlow;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float ring = exp(-pow((d - 0.92) * 55.0, 2.0));
            float front = mix(0.15, 1.0, pow(1.0 - vUv.y, 1.8));
            float glow = ring * front * uGlow;
            gl_FragColor = vec4(vec3(0.9, 0.9, 0.9), glow);
          }
        `,
      })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = FLOOR_Y + 0.01;
    scene.add(floorRing);

    // Composer & Post processing
    const composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(container.clientWidth, container.clientHeight, {
        type: THREE.HalfFloatType,
        samples: isMobile ? 1 : 2,
      })
    );
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      params.bloomStrength,
      params.bloomRadius,
      params.bloomThreshold
    );
    composer.addPass(bloomPass);

    const FinalShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uAberration: { value: params.aberration },
      },
      vertexShader: flatVertexShader,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uAberration;
        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 dir = vUv - 0.5;
          float dist = length(dir);

          float amt = uAberration * dist * dist * 8.0;
          vec3 color = vec3(
            texture2D(tDiffuse, vUv - dir * amt).r,
            texture2D(tDiffuse, vUv).g,
            texture2D(tDiffuse, vUv + dir * amt).b
          );

          color *= smoothstep(0.95, 0.35, dist);
          color += (random(vUv) - 0.5) * 0.005;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    };
    const finalPass = new ShaderPass(FinalShader);
    composer.addPass(finalPass);
    composer.addPass(new OutputPass());

    // Front card detector
    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const getFrontCard = (): THREE.Mesh => {
      let best = cards[0];
      let bestZ = -Infinity;
      for (const card of cards) {
        const z = Math.cos(card.userData.angle + stateRef.current.theta);
        if (z > bestZ) {
          bestZ = z;
          best = card;
        }
      }
      if (stateRef.current.currentFront && stateRef.current.currentFront !== best) {
        const currentZ = Math.cos(
          stateRef.current.currentFront.userData.angle + stateRef.current.theta
        );
        if (bestZ - currentZ < 0.02) return stateRef.current.currentFront;
      }
      stateRef.current.currentFront = best;
      return best;
    };

    // Open & Close Card GSAP animation
    const openCard = (card: THREE.Mesh) => {
      stateRef.current.state = "opening";
      stateRef.current.openedCard = card;
      stateRef.current.velocity = 0;
      setExpandedTool(card.userData.tool);
      setShowSchemaModal(false);
      setSuppressCardControls(false);
      if (onSelectTool) onSelectTool(card.userData.tool);

      const thetaTarget =
        -card.userData.angle +
        Math.round((stateRef.current.theta + card.userData.angle) / (Math.PI * 2)) *
          Math.PI *
          2;

      const visH = 2 * OPEN_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const visW = visH * camera.aspect;
      const targetSize = Math.min(visH * 0.8, visW * 0.8);
      const targetScale = targetSize / CARD_HEIGHT;

      const targetLocal = new THREE.Vector3(0, 0, camera.position.z - OPEN_DISTANCE).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -thetaTarget
      );

      let rotTarget = -thetaTarget;
      rotTarget += Math.round((card.rotation.y - rotTarget) / (Math.PI * 2)) * Math.PI * 2;

      const tl = gsap.timeline({ onComplete: () => (stateRef.current.state = "open") });
      tl.to(
        { t: stateRef.current.theta },
        {
          t: thetaTarget,
          duration: 0.9,
          ease: "power3.inOut",
          onUpdate() {
            stateRef.current.theta = (this as any).targets()[0].t;
          },
        },
        0
      );
      tl.to(
        card.position,
        {
          x: targetLocal.x,
          y: targetLocal.y,
          z: targetLocal.z,
          duration: 1.2,
          ease: "power3.inOut",
        },
        0.1
      );
      tl.to(
        card.rotation,
        {
          x: 0,
          y: rotTarget,
          z: 0,
          duration: 1.2,
          ease: "power3.inOut",
        },
        0.1
      );
      tl.to(
        card.scale,
        {
          x: targetScale,
          y: targetScale,
          z: 1,
          duration: 1.2,
          ease: "power3.inOut",
        },
        0.1
      );
      tl.to(
        { p: 0 },
        {
          p: 1,
          duration: 1.2,
          ease: "power3.inOut",
          onUpdate() {
            const val = (this as any).targets()[0].p;
            stateRef.current.openProgressVal = val;
            setOpenProgress(val);
          },
        },
        0.1
      );
      tl.to(
        (card.material as THREE.ShaderMaterial).uniforms.uOpen,
        {
          value: 1,
          duration: 0.9,
          ease: "power2.inOut",
        },
        0.5
      );
    };

    const closeCard = () => {
      setShowSchemaModal(false);
      const card = stateRef.current.openedCard;
      if (!card) {
        setExpandedTool(null);
        setOpenProgress(0);
        stateRef.current.openProgressVal = 0;
        setCardScreenBounds(null);
        stateRef.current.state = "closed";
        return;
      }
      stateRef.current.state = "closing";
      const { basePos, angle } = card.userData;

      let rotBase = angle;
      rotBase += Math.round((card.rotation.y - rotBase) / (Math.PI * 2)) * Math.PI * 2;

      const tl = gsap.timeline({
        onComplete: () => {
          stateRef.current.state = "closed";
          stateRef.current.openedCard = null;
          stateRef.current.openProgressVal = 0;
          setOpenProgress(0);
          setCardScreenBounds(null);
          setExpandedTool(null);
        },
      });
      tl.to(
        { p: 1 },
        {
          p: 0,
          duration: 1.1,
          ease: "power3.inOut",
          onUpdate() {
            const val = (this as any).targets()[0].p;
            stateRef.current.openProgressVal = val;
            setOpenProgress(val);
          },
        },
        0
      );
      tl.to(
        (card.material as THREE.ShaderMaterial).uniforms.uOpen,
        {
          value: 0,
          duration: 0.7,
          ease: "power2.inOut",
        },
        0
      );
      tl.to(
        card.position,
        {
          x: basePos.x,
          y: basePos.y,
          z: basePos.z,
          duration: 1.1,
          ease: "power3.inOut",
        },
        0.1
      );
      tl.to(card.rotation, { x: 0, y: rotBase, z: 0, duration: 1.1, ease: "power3.inOut" }, 0.1);
      tl.to(card.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: "power3.inOut" }, 0.1);
    };

    let navTween: gsap.core.Tween | null = null;
    const goToCard = (index: number) => {
      if (stateRef.current.state !== "closed") return;
      stateRef.current.velocity = 0;
      lastInteract = clock.elapsedTime;
      navTween?.kill();
      const targetCardIndex = (index + CARD_COUNT) % CARD_COUNT;
      const angle = cards[targetCardIndex].userData.angle;
      const target =
        -angle + Math.round((stateRef.current.theta + angle) / (Math.PI * 2)) * (Math.PI * 2);
      navTween = gsap.to(
        { t: stateRef.current.theta },
        {
          t: target,
          duration: 0.9,
          ease: "power3.inOut",
          onUpdate() {
            stateRef.current.theta = (this as any).targets()[0].t;
          },
        }
      );
    };

    const stepCard = (dir: number) => {
      const currentFront = getFrontCard();
      const currentIdx = cards.indexOf(currentFront);
      goToCard((currentIdx + dir + CARD_COUNT) % CARD_COUNT);
    };

    stateRef.current.goToCard = goToCard;
    stateRef.current.stepCard = stepCard;
    stateRef.current.openFrontCard = () => openCard(getFrontCard());
    stateRef.current.openCard = openCard;
    stateRef.current.closeCard = closeCard;

    // Event listeners
    const handlePointerDown = (e: PointerEvent) => {
      stateRef.current.downX = stateRef.current.lastX = e.clientX;
      stateRef.current.downY = e.clientY;
      if (stateRef.current.state === "closed") {
        stateRef.current.dragging = true;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
      }
      if (stateRef.current.dragging) {
        const delta = e.clientX - stateRef.current.lastX;
        stateRef.current.lastX = e.clientX;
        stateRef.current.theta += delta * 0.006;
        stateRef.current.velocity = delta * 0.36;
        lastInteract = clock.elapsedTime;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      stateRef.current.dragging = false;
      const moved = Math.hypot(
        e.clientX - stateRef.current.downX,
        e.clientY - stateRef.current.downY
      );
      if (moved > 8) return;

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isInsideContainer =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!isInsideContainer) return;

      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);

      if (stateRef.current.state === "closed") {
        const intersects = raycaster.intersectObjects(cards, false);
        if (intersects.length > 0) {
          openCard(intersects[0].object as THREE.Mesh);
        } else {
          openCard(getFrontCard());
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (stateRef.current.state === "closed") {
        stateRef.current.velocity += e.deltaY * 0.0025;
        lastInteract = clock.elapsedTime;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSchemaModalRef.current) closeSchemaModal();
        else if (stateRef.current.state === "open") closeCard();
      } else if (e.key === "ArrowRight") stepCard(1);
      else if (e.key === "ArrowLeft") stepCard(-1);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    // Animation Loop with IntersectionObserver
    const clock = new THREE.Clock();
    let motionSmooth = 0;
    let lastInteract = 0;
    let idleSpin = 0;
    let lastFrontIdx = -1;
    let animId: number;
    let isGalleryVisible = true;
    let lastFrameTime = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isGalleryVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const tick = (timestamp: number) => {
      animId = requestAnimationFrame(tick);

      if (!isGalleryVisible) return;

      if (timestamp - lastFrameTime < 14) return;
      lastFrameTime = timestamp;

      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      if (stateRef.current.state === "closed" && !stateRef.current.dragging) {
        stateRef.current.theta += stateRef.current.velocity * dt;
        stateRef.current.velocity *= Math.exp(-2.2 * dt);

        const idle = t - lastInteract > 2.5 ? 1 : 0;
        idleSpin += (idle - idleSpin) * Math.min(1, dt * 1.2);
        stateRef.current.theta += 0.08 * idleSpin * dt;
      }
      carousel.rotation.y = stateRef.current.theta;

      motionSmooth +=
        (Math.min(1, Math.abs(stateRef.current.velocity) * 0.7) - motionSmooth) *
        Math.min(1, dt * 4);

      const front = getFrontCard();
      const frontIdx = cards.indexOf(front);

      if (frontIdx !== lastFrontIdx && frontIdx !== -1) {
        lastFrontIdx = frontIdx;
        setActiveIndex(frontIdx);
      }

      for (const card of cards) {
        const u = card.userData;
        const mat = card.material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value = t + u.phase * 10;
        mat.uniforms.uTheta.value = stateRef.current.theta;
        mat.uniforms.uMotion.value = motionSmooth;

        const targetFocus =
          card === front && stateRef.current.state === "closed" ? 1 : 0;
        u.focus += (targetFocus - u.focus) * Math.min(1, dt * 5);
        mat.uniforms.uFocus.value = u.focus;

        if (card === stateRef.current.openedCard) continue;

        card.position.y = 0;
        card.rotation.y = u.angle;
        card.rotation.x = 0;

        const s = 1 + 0.08 * u.focus;
        card.scale.setScalar(s);
      }

      // Keep opened 3D card steady facing forward without mouse pointer tilt
      if (stateRef.current.openedCard && (stateRef.current.state === "open" || stateRef.current.state === "opening")) {
        let rotY = -stateRef.current.theta;
        rotY +=
          Math.round(
            (stateRef.current.openedCard.rotation.y - rotY) / (Math.PI * 2)
          ) *
          Math.PI *
          2;
        stateRef.current.openedCard.rotation.y +=
          (rotY - stateRef.current.openedCard.rotation.y) * Math.min(1, dt * 4);
        stateRef.current.openedCard.rotation.x +=
          (0 - stateRef.current.openedCard.rotation.x) * Math.min(1, dt * 4);
      }

      if (overlayRef.current && stateRef.current.openedCard && stateRef.current.state !== "closed") {
        const card = stateRef.current.openedCard;
        const overlay = overlayRef.current;
        card.updateWorldMatrix(true, false);

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const corner of overlayCorners) {
          overlayCorner.copy(corner);
          card.localToWorld(overlayCorner);
          overlayCorner.project(camera);
          const x = (overlayCorner.x * 0.5 + 0.5) * container.clientWidth;
          const y = (-overlayCorner.y * 0.5 + 0.5) * container.clientHeight;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }

        const visualSize = Math.max(maxX - minX, maxY - minY);
        const overlaySize = overlay.offsetWidth || 410;
        const scale = Math.max(0.01, visualSize / overlaySize);
        overlay.style.left = `${(minX + maxX) / 2}px`;
        overlay.style.top = `${(minY + maxY) / 2}px`;
        overlay.style.transform = `translate(-50%, -50%) scale(${scale})`;
        overlay.style.opacity = "1";
      }

      pointerSmooth.x += (pointer.x - pointerSmooth.x) * Math.min(1, dt * 2.2);
      pointerSmooth.y += (pointer.y - pointerSmooth.y) * Math.min(1, dt * 2.2);

      finalPass.uniforms.uTime.value = t;
      composer.render();
    };

    animId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fitCameraDistance();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      textures.forEach((t) => t.dispose());
      cardGeometry.dispose();
      cards.forEach((c) => (c.material as THREE.Material).dispose());
      renderer.dispose();
    };
  }, [tools, onSelectTool]);

  const copySchemaToClipboard = (schemaObj: object) => {
    navigator.clipboard.writeText(JSON.stringify(schemaObj, null, 2));
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div ref={containerRef} className="dg-container">
      <canvas ref={canvasRef} className="dg-canvas" />

      {/* Radial Glow Overlay matching monochrome Apple minimal theme */}
      <div className="dg-glow" />

      {/* Integrated Click-to-Expand Hint */}
      {!expandedTool && (
        <div
          style={{
            position: "absolute",
            left: "2rem",
            top: "2rem",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-low)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            pointerEvents: "none",
            opacity: 0.8,
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              backgroundColor: "var(--text-low)",
              display: "inline-block",
            }}
          />
          <span>Click card to expand</span>
          <ArrowUpRight style={{ width: "13px", height: "13px", strokeWidth: 2 }} />
        </div>
      )}

      {/* Counter & Panel Right */}
      {!expandedTool && (
        <div className="dg-panel-right">
          <div>
            <span className="dg-counter-idx">
              / {String(activeIndex + 1).padStart(2, "0")}
            </span>
            <span className="dg-counter-title">
              {tools[activeIndex]?.name || "Tool"}
            </span>
          </div>

          {/* Arrow Navigation */}
          <div style={{ display: "flex", gap: "0.5rem", pointerEvents: "auto" }}>
            <button
              className="dg-circle-btn"
              onClick={() => stateRef.current.stepCard(-1)}
              onPointerDown={stopCarouselPointerEvent}
              onPointerUp={stopCarouselPointerEvent}
              title="Previous tool"
            >
              <ArrowLeft style={{ width: "14px", height: "14px" }} />
            </button>
            <button
              className="dg-circle-btn"
              onClick={() => stateRef.current.stepCard(1)}
              onPointerDown={stopCarouselPointerEvent}
              onPointerUp={stopCarouselPointerEvent}
              title="Next tool"
            >
              <ArrowRight style={{ width: "14px", height: "14px" }} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Thumbnail Strip */}
      {!expandedTool && (
        <div className="dg-thumb-strip">
          <button
            className="dg-circle-btn"
            style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}
            onClick={() => stateRef.current.stepCard(-1)}
            onPointerDown={stopCarouselPointerEvent}
            onPointerUp={stopCarouselPointerEvent}
          >
            <ArrowLeft style={{ width: "13px", height: "13px" }} />
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {tools.map((t, idx) => (
              <button
                key={t.num}
                onClick={() => stateRef.current.goToCard(idx)}
                onPointerDown={stopCarouselPointerEvent}
                onPointerUp={stopCarouselPointerEvent}
                className={`dg-thumb-pill${idx === activeIndex ? " active" : ""}`}
              >
                {t.num} {t.name.split("_")[0]}
              </button>
            ))}
          </div>

          <button
            className="dg-circle-btn"
            style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}
            onClick={() => stateRef.current.stepCard(1)}
            onPointerDown={stopCarouselPointerEvent}
            onPointerUp={stopCarouselPointerEvent}
            title="Next tool"
          >
            <ArrowRight style={{ width: "13px", height: "13px" }} />
          </button>
        </div>
      )}

      {/* Interactive Controls Positioned STRICTLY INSIDE the Visual 3D Card Face (Animated & 3D Tilting 1:1 with Card Mesh) */}
      {expandedTool && !showSchemaModal && !suppressCardControls && (stateRef.current.state === "open" || stateRef.current.state === "opening" || stateRef.current.state === "closing") && (stateRef.current.state === "closing" || openProgress > 0.05) && (
        <div
          ref={overlayRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) scale(0.01)",
            opacity: 0,
            width: "min(76vw, 410px)",
            height: "min(76vw, 410px)",
            zIndex: 100,
            pointerEvents: "none",
            boxSizing: "border-box",
            transformStyle: "preserve-3d",
            willChange: "transform, opacity",
          }}
        >
          {/* Upper Right Close Button [✕] strictly inside 3D Card Top-Right Corner */}
          <button
            onClick={() => stateRef.current.closeCard()}
            className="active-press"
            title="Close Card"
            aria-label="Close Card"
            style={{
              position: "absolute",
              top: "32px",
              right: "32px",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border: "1.5px solid rgba(255, 255, 255, 0.75)",
              background: "rgba(10, 10, 10, 0.45)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.65)",
              pointerEvents: "auto",
              transform: "scale(0.7)",
              transformOrigin: "top right",
            }}
          >
            <X style={{ width: "22px", height: "22px", strokeWidth: 2.5 }} />
          </button>

          {/* Bottom Center View JSON Schema Button strictly inside 3D Card Bottom-Center */}
          <button
            onClick={openSchemaModal}
            className="active-press"
            style={{
              position: "absolute",
              bottom: "40px",
              left: "50%",
              transform: "translateX(-50%) scale(0.7)",
              transformOrigin: "bottom center",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              padding: "0.95rem 1.85rem",
              borderRadius: "100px",
              border: "1.5px solid rgba(255, 255, 255, 0.75)",
              background: "rgba(10, 10, 10, 0.45)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: "#ffffff",
              fontFamily: 'var(--font-mono), "Geist Mono", monospace',
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 14px 40px rgba(0, 0, 0, 0.75)",
              pointerEvents: "auto",
            }}
          >
            <Settings style={{ width: "16px", height: "16px" }} /> View JSON Schema & Parameters
          </button>
        </div>
      )}

      {/* JSON Schema Popup Inspector - 60FPS GSAP LIQUID SPRING ANIMATIONS */}
      {expandedTool && expandedTool.schema && showSchemaModal && (
        createPortal(
        <div
          ref={modalOverlayRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "1.5rem",
            pointerEvents: "auto",
            overscrollBehavior: "contain",
            willChange: "opacity",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSchemaModal();
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            ref={modalCardRef}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "760px",
              height: "min(620px, calc(100vh - 3rem))",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(135deg, rgba(16, 18, 28, 0.98) 0%, rgba(10, 12, 22, 0.98) 50%, rgba(4, 4, 12, 0.99) 100%)",
              border: "2.5px solid rgba(255, 255, 255, 0.75)",
              borderRadius: "22px",
              padding: "2rem 2.25rem",
              color: "#ffffff",
              overflow: "hidden",
              boxShadow: "0 40px 100px rgba(0, 0, 0, 0.98), 0 0 60px rgba(56, 189, 248, 0.22), 0 0 90px rgba(168, 85, 247, 0.18), inset 0 0 40px rgba(255, 255, 255, 0.08)",
              willChange: "transform, opacity",
            }}
          >
            {/* Iridescent Holographic Voronoi Ambient Color Glow Layer */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "radial-gradient(ellipse at 20% 20%, rgba(56, 189, 248, 0.28), transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(168, 85, 247, 0.25), transparent 55%), radial-gradient(ellipse at 50% 85%, rgba(236, 72, 153, 0.2), transparent 60%)",
                zIndex: 0,
              }}
            />

            {/* Voronoi Crystalline Facet Cell Grid SVG Pattern with Iridescent Tints */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                opacity: 0.32,
                zIndex: 0,
              }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="voronoiModalGrid"
                  width="120"
                  height="120"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M0 0 L60 25 L120 0 L95 60 L120 120 L60 95 L0 120 L25 60 Z M60 25 L60 95 M25 60 L95 60"
                    fill="none"
                    stroke="rgba(192, 132, 252, 0.7)"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <polygon points="30,15 90,15 105,60 90,105 30,105 15,60" fill="none" stroke="rgba(56, 189, 248, 0.7)" strokeWidth="1" />
                  <line x1="15" y1="60" x2="105" y2="60" stroke="rgba(244, 114, 182, 0.6)" strokeWidth="0.8" />
                  <line x1="60" y1="15" x2="60" y2="105" stroke="rgba(168, 85, 247, 0.6)" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#voronoiModalGrid)" />
            </svg>

            {/* Voronoi Sweeping Holographic Iridescent Sheen Overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(120deg, transparent 0%, rgba(56, 189, 248, 0.15) 30%, rgba(192, 132, 252, 0.24) 50%, rgba(244, 114, 182, 0.15) 70%, transparent 100%)",
                opacity: 0.85,
                zIndex: 0,
              }}
            />

          {/* Modal Header matching Card Texture typography & badges 1:1 */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "1rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <div>
              {/* Badge & Number */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  marginBottom: "0.625rem",
                }}
              >
                <span
                  style={{
                    fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                  }}
                >
                  <SlidersHorizontal style={{ width: "14px", height: "14px", strokeWidth: 2 }} />
                  / {expandedTool.num}
                </span>
                <span
                  style={{
                    padding: "0.2rem 0.65rem",
                    borderRadius: "4px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#d4d4d8",
                    letterSpacing: "0.08em",
                  }}
                >
                  {expandedTool.tag}
                </span>
              </div>

              {/* Title in Syne Font */}
              <h3
                style={{
                  fontFamily: '"Syne", system-ui, sans-serif',
                  fontSize: "1.65rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                {expandedTool.name}
              </h3>

              {/* Card White Accent Line */}
              <div
                style={{
                  width: "95px",
                  height: "3.5px",
                  backgroundColor: "#ffffff",
                  borderRadius: "2px",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Tab Selector with Icons */}
              <div
                style={{
                  display: "flex",
                  borderRadius: "8px",
                  backgroundColor: "#080808",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  padding: "3px",
                }}
              >
                <button
                  onClick={() => setActiveTab("params")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.38rem 0.85rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor:
                      activeTab === "params" ? "#222222" : "transparent",
                    color: activeTab === "params" ? "#ffffff" : "var(--text-medium)",
                    fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <ListFilter style={{ width: "13px", height: "13px" }} /> Parameters
                </button>
                <button
                  onClick={() => setActiveTab("schema")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.38rem 0.85rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor:
                      activeTab === "schema" ? "#222222" : "transparent",
                    color: activeTab === "schema" ? "#ffffff" : "var(--text-medium)",
                    fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Code2 style={{ width: "13px", height: "13px" }} /> Raw JSON Schema
                </button>
              </div>

              {/* Close Modal Button with Icon */}
              <button
                onClick={closeSchemaModal}
                className="active-press"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <X style={{ width: "15px", height: "15px" }} /> Close
              </button>
            </div>
          </div>

          {/* Card Tool Description in DM Sans Font */}
          <p
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: "0.9rem",
              color: "#e4e4e7",
              marginBottom: "1.25rem",
              lineHeight: 1.5,
              fontFamily: '"DM Sans", system-ui, sans-serif',
            }}
          >
            {expandedTool.desc}
          </p>

          {/* Content Body inside matching dark Obsidian boxes with icons */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              paddingRight: "0.5rem",
            }}
          >
            {activeTab === "params" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {Object.entries(expandedTool.schema.properties || {}).map(
                  ([key, prop]: [string, any]) => {
                    const isRequired = (
                      expandedTool.schema?.required || []
                    ).includes(key);
                    return (
                      <div
                        key={key}
                        style={{
                          padding: "1.1rem 1.35rem",
                          borderRadius: "12px",
                          backgroundColor: "#0d0d0d",
                          border: "1px solid rgba(255, 255, 255, 0.22)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.625rem",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                                fontSize: "0.9rem",
                                fontWeight: 700,
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                              }}
                            >
                              <KeyRound style={{ width: "13px", height: "13px", color: "var(--text-medium)" }} />
                              {key}
                            </span>
                            <span
                              style={{
                                fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                                fontSize: "0.7rem",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "4px",
                                backgroundColor: "rgba(255, 255, 255, 0.1)",
                                color: "#d4d4d8",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <Type style={{ width: "11px", height: "11px" }} />
                              {prop.type || "string"}
                            </span>
                          </div>
                          <span
                            style={{
                              fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                              fontSize: "0.6875rem",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "4px",
                              backgroundColor: isRequired
                                ? "rgba(255, 255, 255, 0.2)"
                                : "transparent",
                              color: isRequired ? "#ffffff" : "var(--text-low)",
                              border: isRequired
                                ? "1px solid rgba(255, 255, 255, 0.4)"
                                : "none",
                              fontWeight: isRequired ? 700 : 400,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            {isRequired ? (
                              <>
                                <AlertCircle style={{ width: "11px", height: "11px" }} /> Required
                              </>
                            ) : (
                              <>
                                <CheckCircle2 style={{ width: "11px", height: "11px" }} /> Optional
                              </>
                            )}
                          </span>
                        </div>
                        {prop.description && (
                          <p
                            style={{
                              fontSize: "0.835rem",
                              color: "#e4e4e7",
                              lineHeight: 1.5,
                              fontFamily: '"DM Sans", system-ui, sans-serif',
                            }}
                          >
                            {prop.description}
                          </p>
                        )}
                        {prop.default !== undefined && (
                          <div
                            style={{
                              fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                              fontSize: "0.75rem",
                              color: "var(--text-low)",
                              marginTop: "0.25rem",
                            }}
                          >
                            Default: <code>{JSON.stringify(prop.default)}</code>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => copySchemaToClipboard(expandedTool.schema!)}
                  className="active-press"
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.4rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    backgroundColor: copiedSchema
                      ? "#ffffff"
                      : "rgba(255, 255, 255, 0.12)",
                    color: copiedSchema ? "#000000" : "#ffffff",
                    fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                >
                  {copiedSchema ? <Check style={{ width: "14px", height: "14px" }} /> : <Copy style={{ width: "14px", height: "14px" }} />}
                  {copiedSchema ? "Copied" : "Copy JSON Schema"}
                </button>
                <pre
                  style={{
                    padding: "1.25rem",
                    borderRadius: "12px",
                    backgroundColor: "#050505",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
                    fontSize: "0.78rem",
                    color: "#e4e4e7",
                    lineHeight: 1.6,
                    overflowX: "auto",
                  }}
                >
                  <code>{JSON.stringify(expandedTool.schema, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
      , document.body)
      )}
    </div>
  );
}
