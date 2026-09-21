'use client';

import { useEffect, useState, useRef } from 'react';
import { useWidgetSDK, useMaxHeight } from '@nitrostack/widgets';
import { NARRATOR_AVATAR_BASE64 } from './avatar_data';
import MarioSprite from './MarioSprite';

interface InfoBlock {
  title: string;
  content: string;
  puzzleType?: 'sequence' | 'collector' | 'match';
  puzzlePrompt?: string;
  puzzleItems?: string[];
  puzzleTarget?: string[];
}

interface GameLevel {
  infoBlocks: InfoBlock[];
  bossQuiz: {
    question: string;
    options: string[];
    correctAnswer: string;
  };
  visuals?: {
    skyColor: string;
    groundColor: string;
    grassColor: string;
    playerEmoji: string;
    bossEmoji: string;
    collectibleEmoji: string;
    sceneryEmoji: string;
  };
}

interface GameData {
  topic: string;
  levels: GameLevel[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export default function OmniGame() {
  const { getToolOutput } = useWidgetSDK();
  const maxHeight = useMaxHeight() || 500;
  const data = getToolOutput<GameData>();

  // Level state
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  // Player state
  const [playerX, setPlayerX] = useState(100);
  const [playerY, setPlayerY] = useState(0);
  const [facingRight, setFacingRight] = useState(true);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);

  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;

  // Voice Narration & Eager Loaded Browser Voices
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Eagerly populate Web Speech voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const vList = window.speechSynthesis.getVoices();
        if (vList.length > 0) {
          setAvailableVoices(vList);
          // Pick best natural female voice by default
          const bestFemale = vList.find(v =>
            v.lang.startsWith('en') && (
              v.name.includes('Natural') ||
              v.name.includes('Online') ||
              v.name.includes('Neural') ||
              v.name.includes('Zira') ||
              v.name.includes('Jenny') ||
              v.name.includes('Aria') ||
              v.name.includes('Samantha') ||
              v.name.includes('Hazel') ||
              v.name.includes('Susan') ||
              v.name.toLowerCase().includes('female')
            )
          ) || vList.find(v => v.lang.startsWith('en'));

          if (bestFemale) {
            setSelectedVoiceName(bestFemale.name);
          }
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Game state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<'none' | 'won' | 'lost'>('none');
  const [hitBlocks, setHitBlocks] = useState<number[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  // Particles
  const [particles, setParticles] = useState<Particle[]>([]);

  // Mini-Puzzle & Active Recall Stage ('reading' | 'challenge')
  const [activePuzzleBlockIndex, setActivePuzzleBlockIndex] = useState<number | null>(null);
  const [puzzleStage, setPuzzleStage] = useState<'reading' | 'challenge'>('reading');
  const [puzzleState, setPuzzleState] = useState<any>(null);
  const [puzzleErrorMsg, setPuzzleErrorMsg] = useState<string | null>(null);

  const hitBlocksRef = useRef<Set<number>>(new Set());
  const currentXRef = useRef(100);
  const currentYRef = useRef(0);
  const activePuzzleRef = useRef<number | null>(null);

  const keys = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number>();
  const velocityY = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastStepTime = useRef(0);
  const hasPlayedBossSound = useRef(false);

  const LEVEL_WIDTH = 3000;
  const GRAVITY = 1.2;
  const JUMP_POWER = -18;
  const MOVE_SPEED = 8;
  const GROUND_Y = 0;

  // Stop any active narration
  const stopSpeech = () => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Human Prosody Voice Engine - Phrase Chunking with Micro-Pauses & Pitch Modulation
  const speakText = (text: string) => {
    if (isMutedRef.current) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    stopSpeech(); // Clear queue & timers

    // Split text into natural spoken phrases at punctuation boundaries
    const clauses = text.match(/[^.!?—,;]+[.!?—,;]?/g) || [text];
    if (clauses.length === 0) return;

    const vList = window.speechSynthesis.getVoices();
    let voiceToUse = vList.find(v => v.name === selectedVoiceName);

    if (!voiceToUse) {
      voiceToUse = vList.find(v =>
        v.lang.startsWith('en') && (
          v.name.includes('Natural') ||
          v.name.includes('Online') ||
          v.name.includes('Neural') ||
          v.name.includes('Zira') ||
          v.name.includes('Jenny') ||
          v.name.includes('Aria') ||
          v.name.includes('Samantha') ||
          v.name.includes('Hazel') ||
          v.name.includes('Susan') ||
          v.name.toLowerCase().includes('female')
        )
      ) || vList.find(v => v.lang.startsWith('en'));
    }

    setIsSpeaking(true);

    let clauseIdx = 0;

    const speakNextClause = () => {
      if (clauseIdx >= clauses.length || isMutedRef.current) {
        setIsSpeaking(false);
        return;
      }

      const clauseText = clauses[clauseIdx].trim();
      if (!clauseText) {
        clauseIdx++;
        speakNextClause();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clauseText);
      if (voiceToUse) utterance.voice = voiceToUse;

      const isTitle = clauseIdx === 0;
      const isEnding = /[.!?]$/.test(clauseText);

      utterance.pitch = isTitle ? 1.25 : (isEnding ? 1.02 : 1.12);
      utterance.rate = isTitle ? 0.92 : 0.96;

      utterance.onend = () => {
        clauseIdx++;
        const pauseTime = isEnding ? 320 : 180;
        speechTimeoutRef.current = setTimeout(speakNextClause, pauseTime);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextClause();
  };

  // Audio Initialization
  const initAudio = () => {
    if (isMutedRef.current) return;
    if (!audioCtxRef.current && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } else if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();
      keys.current[e.code] = true;
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const handleMouseClick = () => {
      initAudio();
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleMouseClick);
    window.addEventListener('mousedown', handleMouseClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('mousedown', handleMouseClick);
      stopSpeech();
    };
  }, []);

  // Audio Synthesizers
  const playJumpSound = () => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  };

  const playStepSound = (time: number) => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    if (time - lastStepTime.current < 220) return;
    lastStepTime.current = time;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  const playCollectSound = () => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const playSolveSound = () => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.2);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
    });
  };

  const playErrorSound = () => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.setValueAtTime(90, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  };

  const playBossEncounterSound = () => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  };

  const playWinSound = () => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const freqs = [440, 554.37, 659.25, 880];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.25);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  };

  const playLoseSound = () => {
    if (isMutedRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(260, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 1.0);
    osc2.frequency.setValueAtTime(270, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(85, ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    osc1.start(); osc2.start();
    osc1.stop(ctx.currentTime + 1.0); osc2.stop(ctx.currentTime + 1.0);
  };

  // Spawn visual particle fireworks
  const spawnParticles = (x: number, y: number, color: string, count: number = 20) => {
    const newP: Particle[] = [];
    const colors = ['#10b981', '#fbbf24', '#38bdf8', '#f43f5e', '#a855f7'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      const pColor = color === 'multi' ? colors[Math.floor(Math.random() * colors.length)] : color;
      newP.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: pColor,
        size: Math.random() * 8 + 4,
        life: 0,
        maxLife: Math.random() * 25 + 25
      });
    }
    setParticles(prev => [...prev.slice(-50), ...newP]);
  };

  // Trigger Checkpoint Mini-Puzzle Setup & Pleasant Voice Speech
  const openCheckpointPuzzle = (index: number) => {
    activePuzzleRef.current = index;
    setActivePuzzleBlockIndex(index);
    setPuzzleStage('reading');
    setPuzzleErrorMsg(null);

    const currentLevel = data.levels?.[currentLevelIndex] || data.levels?.[0];
    const block = currentLevel.infoBlocks?.[index];

    if (block?.content) {
      speakText(`${block.title}. ${block.content}`);
    }

    const rawType = block?.puzzleType || (index % 2 === 0 ? 'sequence' : 'collector');
    const rawItems = Array.isArray(block?.puzzleItems) && block.puzzleItems.length >= 3
      ? block.puzzleItems
      : [block?.title || 'Concept A', 'Step 2', 'Step 3', 'Final Phase'];

    const rawTarget = Array.isArray(block?.puzzleTarget) && block.puzzleTarget.length > 0
      ? block.puzzleTarget
      : [rawItems[0], rawItems[1]];

    if (rawType === 'sequence') {
      const targetOrder = [...rawItems];
      const shuffled = [...rawItems].sort(() => Math.random() - 0.5);
      setPuzzleState({
        type: 'sequence',
        shuffled,
        selected: [],
        targetOrder
      });
    } else {
      const correctItemNames = new Set(rawTarget);
      const items = rawItems.map((name, i) => ({
        id: i + 1,
        name,
        isCorrect: correctItemNames.has(name)
      }));

      const requiredCount = rawTarget.length;

      setPuzzleState({
        type: 'collector',
        items,
        caughtCorrect: 0,
        requiredCorrect: requiredCount
      });
    }
  };

  const solveCheckpointPuzzle = () => {
    stopSpeech();
    playSolveSound();
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);

    const idx = activePuzzleRef.current;
    if (idx !== null && !hitBlocksRef.current.has(idx)) {
      hitBlocksRef.current.add(idx);
      setHitBlocks(Array.from(hitBlocksRef.current));
      spawnParticles(currentXRef.current, 180, 'multi', 45);
    }
    activePuzzleRef.current = null;
    setActivePuzzleBlockIndex(null);
    setPuzzleStage('reading');
    setPuzzleState(null);
    setPuzzleErrorMsg(null);
  };

  const handlePuzzleFailure = (msg: string) => {
    stopSpeech();
    playErrorSound();
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
    setPuzzleErrorMsg(msg);

    setTimeout(() => {
      setPuzzleStage('reading');
    }, 1400);
  };

  // Main Game Loop & Collision Wall
  useEffect(() => {
    if (!data) return;

    let lastTime = performance.now();

    const gameLoop = (time: number) => {
      if (activePuzzleRef.current !== null) {
        lastTime = time;
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const deltaTime = time - lastTime;
      lastTime = time;
      const timeScale = Math.min(deltaTime / (1000 / 60), 2);

      // Update Particles
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.3,
        life: p.life + 1
      })).filter(p => p.life < p.maxLife));

      const currentLevel = data.levels?.[currentLevelIndex] || data.levels?.[0];
      const activeBlocks = currentLevel.infoBlocks || [];
      const spacing = (LEVEL_WIDTH - 500) / activeBlocks.length;

      // Find the first unsolved checkpoint wall limit
      let maxAllowedX = LEVEL_WIDTH - 100;
      for (let i = 0; i < activeBlocks.length; i++) {
        if (!hitBlocksRef.current.has(i)) {
          const blockX = 400 + i * spacing;
          maxAllowedX = blockX + 60;
          break;
        }
      }

      // Player Movement & Wall Collision
      setPlayerX(prevX => {
        let newX = prevX;
        let isMoving = false;

        if (keys.current['ArrowRight'] || keys.current['KeyD']) {
          newX += MOVE_SPEED * timeScale;
          setFacingRight(true);
          isMoving = true;
        }
        if (keys.current['ArrowLeft'] || keys.current['KeyA']) {
          newX -= MOVE_SPEED * timeScale;
          setFacingRight(false);
          isMoving = true;
        }

        setIsPlayerMoving(isMoving);

        if (isMoving && prevX !== newX) {
          setPlayerY(currentY => {
            if (currentY === GROUND_Y) playStepSound(time);
            return currentY;
          });
        }

        if (newX < 50) newX = 50;

        if (newX > maxAllowedX) {
          newX = maxAllowedX;
          setGateMessage("🔒 GATE LOCKED! Solve the Checkpoint puzzle to proceed!");
          setTimeout(() => setGateMessage(null), 1500);
        }

        if (newX > LEVEL_WIDTH - 300) {
          if (!hasPlayedBossSound.current) {
            playBossEncounterSound();
            hasPlayedBossSound.current = true;
          }
          if (!showQuiz && quizResult === 'none') {
            setShowQuiz(true);
          }
        }

        currentXRef.current = newX;
        return newX;
      });

      // Player Jumping & Checkpoint Collision
      setPlayerY(prevY => {
        let newY = prevY;

        if ((keys.current['Space'] || keys.current['ArrowUp'] || keys.current['KeyW']) && newY === GROUND_Y) {
          velocityY.current = JUMP_POWER;
          playJumpSound();
          spawnParticles(currentXRef.current, 60, '#cbd5e1', 8);
        }

        velocityY.current += GRAVITY * timeScale;
        newY += velocityY.current * timeScale;

        const heightAboveGround = -newY;

        if (currentLevel.infoBlocks) {
          for (let i = 0; i < activeBlocks.length; i++) {
            const blockX = 400 + i * spacing;

            const isXOverlap = Math.abs(currentXRef.current - blockX) <= 45;
            const isYOverlap = heightAboveGround >= 55 && heightAboveGround <= 185;

            if (isXOverlap && isYOverlap) {
              if (!hitBlocksRef.current.has(i) && activePuzzleRef.current === null) {
                playCollectSound();
                openCheckpointPuzzle(i);
              }
            }
          }
        }

        if (newY >= GROUND_Y) {
          newY = GROUND_Y;
          velocityY.current = 0;
        }

        currentYRef.current = newY;
        return newY;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [data, showQuiz, quizResult, currentLevelIndex]);

  if (!data || !data.topic || !data.levels || data.levels.length === 0) {
    return <div style={{ padding: '20px', color: 'white', backgroundColor: '#0f172a', height: maxHeight, borderRadius: 12 }}>Loading 2D Game...</div>;
  }

  const currentLevel = data.levels[currentLevelIndex] || data.levels[0];
  const { visuals } = currentLevel;
  const cameraX = Math.max(0, Math.min(playerX - 300, LEVEL_WIDTH - 800));

  const totalCheckpoints = currentLevel.infoBlocks?.length || 3;
  const clearedCheckpoints = hitBlocks.length;

  const handleQuizAnswer = (option: string) => {
    if (currentLevel.bossQuiz && option === currentLevel.bossQuiz.correctAnswer) {
      setQuizResult('won');
      playWinSound();
      spawnParticles(LEVEL_WIDTH - 200, 200, 'multi', 50);
    } else {
      setQuizResult('lost');
      playLoseSound();
    }
    setShowQuiz(false);
  };

  return (
    <div style={{
      width: '100%',
      height: maxHeight,
      backgroundColor: visuals?.skyColor || '#87CEEB',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transform: screenShake ? 'translate(4px, -4px)' : 'none',
      transition: 'transform 0.05s ease-in-out'
    }}>

      {/* Top HUD */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 100, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
          <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.88)', color: '#fff', padding: '6px 14px', borderRadius: 8, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontWeight: 700 }}>
            {data.topic} · Level {currentLevelIndex + 1} of 3
          </div>
          <div style={{ backgroundColor: clearedCheckpoints === totalCheckpoints ? '#059669' : 'rgba(30, 41, 59, 0.9)', color: '#fff', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 700 }}>
            🌟 Checkpoints: {clearedCheckpoints} / {totalCheckpoints} Cleared
          </div>
        </div>

        <button
          onClick={() => {
            setIsMuted(!isMuted);
            if (!isMuted) stopSpeech();
          }}
          style={{ pointerEvents: 'auto', backgroundColor: 'rgba(15, 23, 42, 0.88)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          {isMuted ? '🔇 Muted' : '🔊 Sound ON'}
        </button>
      </div>

      {/* Gate Locked Warning Banner */}
      {gateMessage && (
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#ef4444', color: '#fff', padding: '8px 18px', borderRadius: 20,
          fontWeight: 800, fontSize: 13, zIndex: 200, boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          border: '2px solid #fff'
        }}>
          {gateMessage}
        </div>
      )}

      {/* Moving Level Canvas */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: -cameraX,
        width: `${LEVEL_WIDTH}px`,
        height: '100%'
      }}>

        {/* Parallax Background Clouds */}
        {[100, 500, 900, 1400, 1900, 2400].map((x, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${x - cameraX * 0.3}px`,
            top: `${30 + (i % 3) * 25}px`,
            fontSize: '40px',
            opacity: 0.4,
            pointerEvents: 'none'
          }}>
            {visuals?.sceneryEmoji || '☁️'}
          </div>
        ))}

        {/* Ground */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '60px',
          backgroundColor: visuals?.groundColor || '#8B4513',
          borderTop: `10px solid ${visuals?.grassColor || '#228B22'}`
        }} />

        {/* Title Signpost */}
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '140px',
          backgroundColor: '#DEB887',
          padding: '10px 16px',
          border: '4px solid #8B4513',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ margin: '0 0 2px 0', fontSize: 14, color: '#3e2723' }}>{data.topic}</h3>
          <h2 style={{ margin: 0, fontSize: 18, color: '#271c19' }}>Level {currentLevelIndex + 1}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#4e342e' }}>Listen & Solve Checkpoints!</p>
        </div>

        {/* Info Blocks (Checkpoints) & Energy Lock Walls */}
        {currentLevel.infoBlocks?.map((block, i) => {
          const spacing = (LEVEL_WIDTH - 500) / currentLevel.infoBlocks.length;
          const blockX = 400 + i * spacing;
          const isHit = hitBlocks.includes(i);

          return (
            <div key={i}>
              {/* Checkpoint Emoji Block */}
              <div style={{
                position: 'absolute',
                bottom: '180px',
                left: `${blockX}px`,
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                animation: isHit ? 'none' : 'bossFloat 2s ease-in-out infinite',
                filter: isHit ? 'brightness(0.4) grayscale(0.6)' : 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))',
                zIndex: 10
              }}>
                {visuals?.collectibleEmoji || '🌟'}
              </div>

              {/* Energy Barrier Wall (Vanishes when solved!) */}
              {!isHit && (
                <div style={{
                  position: 'absolute',
                  bottom: '60px',
                  left: `${blockX + 60}px`,
                  width: '16px',
                  height: '240px',
                  background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.8), rgba(225, 29, 72, 0.4))',
                  border: '2px dashed #f87171',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 900,
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.8)',
                  zIndex: 20
                }}>
                  🔒
                </div>
              )}
            </div>
          );
        })}

        {/* Boss Character */}
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: `${LEVEL_WIDTH - 200}px`,
          width: '120px',
          height: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          fontSize: '90px',
          animation: quizResult === 'won' ? 'bossDefeat 2s forwards' : 'bossFloat 3s ease-in-out infinite',
          filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))'
        }}>
          {quizResult !== 'won' && (
            <>
              {visuals?.bossEmoji || '👾'}
              <div style={{ color: '#fff', fontWeight: 800, marginTop: '-6px', backgroundColor: 'rgba(225, 29, 72, 0.9)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                LEVEL {currentLevelIndex + 1} BOSS
              </div>
            </>
          )}
        </div>

        {/* Visual Particles */}
        {particles.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.x}px`,
            bottom: `${60 - p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: 1 - p.life / p.maxLife,
            zIndex: 90
          }} />
        ))}

        {/* Authentic 16-bit Super Mario Player Character */}
        <div style={{
          position: 'absolute',
          bottom: `${60 - playerY}px`,
          left: `${playerX}px`,
          transform: 'translateX(-50%)',
          zIndex: 100
        }}>
          <MarioSprite
            facingRight={facingRight}
            isMoving={isPlayerMoving}
            isJumping={playerY < 0}
            width={54}
            height={70}
          />
        </div>
      </div>

      {/* Clash of Clans Style Full-Body Character Guide Dialogue Overlay */}
      {activePuzzleBlockIndex !== null && currentLevel.infoBlocks?.[activePuzzleBlockIndex] && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '16px 20px',
          backdropFilter: 'blur(10px)'
        }}>
          
          {/* Phase 1: Clash of Clans Style Dialogue (Seamless Frameless Character Cutout!) */}
          {puzzleStage === 'reading' && (
            <div style={{
              width: '100%',
              maxWidth: 750,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              position: 'relative'
            }}>

              {/* Seamless Character Standee Container without ANY Rectangle Box Frame */}
              <div style={{
                width: 240,
                height: 330,
                flexShrink: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                boxShadow: 'none'
              }}>

                {/* Speaking Indicator Badge above character */}
                {isSpeaking && (
                  <div style={{
                    position: 'absolute', top: -10,
                    backgroundColor: '#10b981', color: '#fff',
                    fontSize: 11, fontWeight: 800, padding: '4px 12px',
                    borderRadius: 14, border: '2px solid #fff',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    zIndex: 30
                  }}>
                    🗣️ SPEAKING...
                  </div>
                )}

                {/* Character Image with CSS Radial Mask & Screen Blend to dissolve all rectangular box borders! */}
                <img
                  src={NARRATOR_AVATAR_BASE64}
                  alt="Clash of Clans Guide"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    WebkitMaskImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 46%, rgba(0,0,0,0) 68%)',
                    maskImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 46%, rgba(0,0,0,0) 68%)',
                    filter: isSpeaking
                      ? 'drop-shadow(0 0 25px rgba(251, 191, 36, 0.9))'
                      : 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                    transform: isSpeaking ? 'scale(1.04)' : 'none',
                    transition: 'all 0.25s ease-in-out'
                  }}
                />
              </div>

              {/* Speech Bubble dialogue box right next to character */}
              <div style={{
                flex: 1,
                backgroundColor: '#1e293b',
                color: '#fff',
                padding: '20px 22px',
                borderRadius: '20px',
                border: '3px solid #fbbf24',
                boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
                position: 'relative',
                marginBottom: 16
              }}>
                {/* Speech Bubble Arrow pointing left towards character */}
                <div style={{
                  position: 'absolute', bottom: 35, left: -14,
                  width: 0, height: 0,
                  borderTop: '12px solid transparent',
                  borderBottom: '12px solid transparent',
                  borderRight: '16px solid #fbbf24'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: '#fbbf24', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1 }}>
                    GUIDE EMMA · CHECKPOINT {activePuzzleBlockIndex + 1}
                  </div>

                  {/* Voice Selector Dropdown */}
                  {availableVoices.length > 0 && (
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => {
                        setSelectedVoiceName(e.target.value);
                        stopSpeech();
                        const block = currentLevel.infoBlocks?.[activePuzzleBlockIndex];
                        if (block) speakText(`${block.title}. ${block.content}`);
                      }}
                      style={{
                        backgroundColor: '#0f172a',
                        color: '#38bdf8',
                        border: '1px solid #3b82f6',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {availableVoices.filter(v => v.lang.startsWith('en')).map(v => (
                        <option key={v.name} value={v.name}>
                          🎙️ {v.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <h3 style={{ margin: '0 0 8px', color: '#38bdf8', fontSize: 18, fontWeight: 800 }}>
                  {currentLevel.infoBlocks[activePuzzleBlockIndex].title}
                </h3>

                <p style={{ margin: '0 0 16px', fontSize: 14, color: '#f1f5f9', lineHeight: 1.55 }}>
                  "{currentLevel.infoBlocks[activePuzzleBlockIndex].content}"
                </p>

                {/* Voice Controls */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <button
                    onClick={() => speakText(`${currentLevel.infoBlocks[activePuzzleBlockIndex].title}. ${currentLevel.infoBlocks[activePuzzleBlockIndex].content}`)}
                    style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  >
                    🔊 Listen Again
                  </button>
                  <button
                    onClick={() => stopSpeech()}
                    style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  >
                    ⏹️ Mute Voice
                  </button>
                </div>

                {/* Start Challenge Button */}
                <button
                  onClick={() => {
                    stopSpeech();
                    setPuzzleStage('challenge');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 800,
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  🧠 I'M READY ➔ START CHALLENGE
                </button>
              </div>

            </div>
          )}

          {/* Phase 2: Active Recall Challenge (Concept text HIDDEN!) */}
          {puzzleStage === 'challenge' && (
            <div style={{
              backgroundColor: '#1e293b',
              color: '#fff',
              padding: 24,
              borderRadius: 20,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
              border: puzzleErrorMsg ? '2px solid #ef4444' : '3px solid #3b82f6',
              textAlign: 'center',
              margin: 'auto'
            }}>
              <h2 style={{ margin: '0 0 10px', color: '#f8fafc', fontSize: 18, fontWeight: 800 }}>
                {currentLevel.infoBlocks[activePuzzleBlockIndex].title}
              </h2>

              {/* Error Feedback Banner */}
              {puzzleErrorMsg && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 12, border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  {puzzleErrorMsg}
                </div>
              )}

              <div style={{ backgroundColor: '#020617', padding: 10, borderRadius: 8, border: '1px dashed #38bdf8', fontSize: 12, color: '#38bdf8', marginBottom: 14 }}>
                🔒 Concept text is hidden! Use active memory recall to answer.
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: 16, borderRadius: 12, border: '1px solid #334155', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 14 }}>
                  {currentLevel.infoBlocks[activePuzzleBlockIndex].puzzlePrompt || "Tap the correct items!"}
                </div>

                {/* Collector Challenge */}
                {puzzleState?.type === 'collector' && (
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                      Progress: ({puzzleState.caughtCorrect}/{puzzleState.requiredCorrect}) correct items selected
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {puzzleState.items.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.isCorrect) {
                              playCollectSound();
                              const nextCount = puzzleState.caughtCorrect + 1;
                              if (nextCount >= puzzleState.requiredCorrect) {
                                solveCheckpointPuzzle();
                              } else {
                                setPuzzleState({
                                  ...puzzleState,
                                  caughtCorrect: nextCount,
                                  items: puzzleState.items.filter((i: any) => i.id !== item.id)
                                });
                              }
                            } else {
                              handlePuzzleFailure(`❌ "${item.name}" is incorrect! Review the concept text!`);
                            }
                          }}
                          style={{
                            padding: '12px 10px',
                            backgroundColor: '#1e293b',
                            color: '#f8fafc',
                            border: '1.5px solid #3b82f6',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.2
                          }}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sequence Challenge */}
                {puzzleState?.type === 'sequence' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Your sequence: {puzzleState.selected.join(' ➔ ') || '(Tap step 1)'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {puzzleState.shuffled.map((item: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const nextIdx = puzzleState.selected.length;
                            const expectedItem = puzzleState.targetOrder[nextIdx];

                            if (item === expectedItem) {
                              playCollectSound();
                              const nextSel = [...puzzleState.selected, item];
                              const nextShuffled = puzzleState.shuffled.filter((s: string) => s !== item);

                              if (nextSel.length === puzzleState.targetOrder.length) {
                                solveCheckpointPuzzle();
                              } else {
                                setPuzzleState({
                                  ...puzzleState,
                                  selected: nextSel,
                                  shuffled: nextShuffled
                                });
                              }
                            } else {
                              handlePuzzleFailure(`❌ Wrong Order! "${item}" is not step #${nextIdx + 1}! Review concept text!`);
                            }
                          }}
                          style={{ padding: '10px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'left' }}
                        >
                          {idx + 1}. {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setPuzzleStage('reading');
                  const block = currentLevel.infoBlocks?.[activePuzzleBlockIndex];
                  if (block) speakText(`${block.title}. ${block.content}`);
                }}
                style={{ backgroundColor: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
              >
                📖 Re-read & Listen Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quiz Modal Overlay */}
      {showQuiz && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            padding: 24,
            borderRadius: 16,
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            border: '3px solid #ef4444'
          }}>
            <h2 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: 20, fontWeight: 800 }}>
              LEVEL {currentLevelIndex + 1} BOSS CHALLENGE! ⚔️
            </h2>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              {currentLevel.bossQuiz?.question || "Prepare to test your knowledge!"}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(currentLevel.bossQuiz?.options || ["Flee!", "Surrender", "Attack"]).map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleQuizAnswer(opt)}
                  style={{
                    padding: '12px',
                    fontSize: 14,
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Victory / Defeat Overlay */}
      {quizResult !== 'none' && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: quizResult === 'won' ? '#065f46' : '#991b1b',
          color: 'white',
          padding: '24px 36px',
          borderRadius: 16,
          fontWeight: 800,
          fontSize: 20,
          border: '2px solid white',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          zIndex: 9999,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div>
            {quizResult === 'won'
              ? (currentLevelIndex < 2 ? 'LEVEL CLEARED! 🎉' : 'YOU BEAT THE GAME! 🏆')
              : 'DEFEATED! 💀'}
          </div>

          <div>
            {quizResult === 'won' && currentLevelIndex < 2 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentLevelIndex(prev => prev + 1);
                  setPlayerX(100);
                  currentXRef.current = 100;
                  setPlayerY(0);
                  currentYRef.current = 0;
                  setQuizResult('none');
                  setShowQuiz(false);
                  setHitBlocks([]);
                  hitBlocksRef.current.clear();
                  hasPlayedBossSound.current = false;
                  keys.current = {};
                }}
                style={{ padding: '12px 24px', fontSize: 16, fontWeight: 800, backgroundColor: '#fff', color: '#059669', border: 'none', borderRadius: 10, cursor: 'pointer' }}
              >
                PROCEED TO LEVEL {currentLevelIndex + 2} ➡️
              </button>
            ) : (
              <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>
                Type <strong>"retry"</strong> in chat to start a fresh game!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
