'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface PathStep {
  nominal: Point3D;
  corrected: Point3D;
  correctedFlag: boolean;
  risk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  correctionDistance: number;
}

interface Obstacle {
  id: string;
  x: number;
  y: number;
  z?: number;
  radius: number;
  label?: string;
}

interface TrajectoryData {
  steps: PathStep[];
  wasCorrected: boolean;
  maxRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalCorrectionDistance: number;
  activeObstacle?: Obstacle;
  obstacles: Obstacle[];
  safetyMode: 'FASTEST' | 'SAFEST';
  timestamp: string;
}

export default function TrajectoryViewer() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();

  // Widget States
  const [state, setState] = useWidgetState<{ viewType: '2D' | '3D' }>(() => ({
    viewType: '2D'
  }));
  const viewType = state?.viewType || '2D';
  const setViewType = (type: '2D' | '3D') => setState({ viewType: type });
  const [localOutput, setLocalOutput] = useState<TrajectoryData | null>(null);
  const [estopActive, setEstopActive] = useState<boolean>(false);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [clickIndicator, setClickIndicator] = useState<{ x: number; y: number } | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Point3D>({ x: 2.0, y: 2.0, z: 0.0 });
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: '🤖 NitroGuard AI Safety Agent online. Ask me to navigate AMR-01 to any cell or coordinates!',
      time: '12:00 PM'
    }
  ]);
  const [promptInput, setPromptInput] = useState('');

  // Get data from SDK
  const sdkOutput = getToolOutput<TrajectoryData>();

  // Mock Fallback Pattern
  const fallbackData: TrajectoryData = {
    steps: [
      { nominal: { x: 2.0, y: 2.0, z: 0 }, corrected: { x: 2.0, y: 2.0, z: 0 }, correctedFlag: false, risk: 'NONE', correctionDistance: 0 },
      { nominal: { x: 2.5, y: 2.5, z: 0 }, corrected: { x: 2.5, y: 2.5, z: 0 }, correctedFlag: false, risk: 'NONE', correctionDistance: 0 },
      { nominal: { x: 3.0, y: 3.0, z: 0 }, corrected: { x: 3.0, y: 3.0, z: 0 }, correctedFlag: false, risk: 'NONE', correctionDistance: 0 },
      { nominal: { x: 3.5, y: 3.5, z: 0 }, corrected: { x: 3.5, y: 3.5, z: 0 }, correctedFlag: false, risk: 'NONE', correctionDistance: 0 },
      { nominal: { x: 4.0, y: 4.0, z: 0 }, corrected: { x: 3.9, y: 3.8, z: 0 }, correctedFlag: true, risk: 'HIGH', correctionDistance: 0.22 },
      { nominal: { x: 4.5, y: 4.5, z: 0 }, corrected: { x: 4.1, y: 3.9, z: 0 }, correctedFlag: true, risk: 'CRITICAL', correctionDistance: 0.72 },
      { nominal: { x: 5.2, y: 5.5, z: 0 }, corrected: { x: 6.77, y: 7.17, z: 0 }, correctedFlag: true, risk: 'CRITICAL', correctionDistance: 2.29 }
    ],
    wasCorrected: true,
    maxRiskLevel: 'CRITICAL',
    totalCorrectionDistance: 3.23,
    activeObstacle: { id: 'obs-1', x: 5.0, y: 5.0, radius: 2.0, label: 'Industrial Press (Hazard Zone)' },
    obstacles: [
      { id: 'obs-1', x: 5, y: 5, radius: 2.0, label: 'Industrial Press (Hazard Zone)' },
      { id: 'obs-2', x: 10, y: 3, radius: 1.5, label: 'High Voltage Cabinet' },
      { id: 'obs-3', x: 7, y: 11, radius: 2.2, label: 'Automated Conveyor' }
    ],
    safetyMode: 'FASTEST',
    timestamp: new Date().toISOString()
  };

  const data = localOutput || sdkOutput || fallbackData;

  // Track position from dataset
  useEffect(() => {
    if (data.steps && data.steps.length > 0) {
      setCurrentCoords(data.steps[data.steps.length - 1].corrected);
    }
  }, [data]);

  // Live sync telemetry from MuJoCo Python Bridge
  useEffect(() => {
    const interval = setInterval(async () => {
      for (const port of [8000, 8001]) {
        try {
          const res = await fetch(`http://localhost:${port}/robot_state`);
          if (res.ok) {
            const state = await res.json();
            if (state && typeof state.x === 'number' && typeof state.y === 'number') {
              setCurrentCoords({ x: state.x, y: state.y, z: state.z || 0 });
            }
            break;
          }
        } catch {}
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Coordinate Projectors
  const project2D = (x: number, y: number) => {
    const padding = 30;
    const size = 340;
    const svgX = padding + (x / 15) * size;
    const svgY = padding + ((15 - y) / 15) * size;
    return { x: svgX, y: svgY };
  };

  const project3D = (x: number, y: number, z: number = 0) => {
    const cx = 7.5;
    const cy = 7.5;
    const rx = (x - cx) * 16;
    const ry = (y - cy) * 16;
    const rz = z * 16;
    const isoX = 200 + (rx - ry) * Math.cos(Math.PI / 6);
    const isoY = 180 + (rx + ry) * Math.sin(Math.PI / 6) - rz;
    return { x: isoX, y: isoY };
  };

  const computeLocalCBF = (startX: number, startY: number, targetX: number, targetY: number, mode: 'FASTEST' | 'SAFEST'): TrajectoryData => {
    const margin = mode === 'SAFEST' ? 1.0 : 0.5;
    const obstacles = [
      { id: 'pressA', label: 'Industrial Robotic Press', x: 5.0, y: 5.0, radius: 2.0 },
      { id: 'cabinet', label: 'High Voltage Cabinet', x: 10.0, y: 3.0, radius: 1.5 },
      { id: 'conveyor', label: 'Automated Gantry', x: 7.0, y: 11.0, radius: 2.2 }
    ];

    const stepsCount = 12;
    const steps: PathStep[] = [];
    let wasCorrected = false;
    let totalCorrectionDistance = 0;
    let maxRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';
    let activeObs: any = undefined;
    const riskRank = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

    // 1. Generate nominal straight-line points
    const nominalPts: { x: number; y: number }[] = [];
    for (let i = 0; i <= stepsCount; i++) {
      const ratio = i / stepsCount;
      nominalPts.push({
        x: Number((startX + ratio * (targetX - startX)).toFixed(2)),
        y: Number((startY + ratio * (targetY - startY)).toFixed(2))
      });
    }

    // 2. Identify obstacles that intersect the nominal line segment
    const dx = targetX - startX;
    const dy = targetY - startY;
    const lineLen = Math.hypot(dx, dy);
    const lineUnitX = lineLen > 1e-4 ? dx / lineLen : 0;
    const lineUnitY = lineLen > 1e-4 ? dy / lineLen : 0;
    // Perpendicular normal to the nominal line (left side)
    const normX = -lineUnitY;
    const normY = lineUnitX;

    const correctedPts: { x: number; y: number; corrected: boolean; corrDist: number }[] = nominalPts.map(p => ({
      x: p.x,
      y: p.y,
      corrected: false,
      corrDist: 0
    }));

    for (const obs of obstacles) {
      const minClearance = obs.radius + margin;

      // Project obstacle center onto nominal line
      const vX = obs.x - startX;
      const vY = obs.y - startY;
      const projDist = vX * lineUnitX + vY * lineUnitY;
      const clampedProj = Math.max(0, Math.min(lineLen, projDist));

      // Closest point on nominal line segment to obstacle center
      const closeX = startX + clampedProj * lineUnitX;
      const closeY = startY + clampedProj * lineUnitY;
      const distToCenter = Math.hypot(closeX - obs.x, closeY - obs.y);

      if (distToCenter < minClearance) {
        wasCorrected = true;
        activeObs = obs;

        // Determine consistent deflection side (left or right of nominal line)
        const sideDot = (obs.x - startX) * normX + (obs.y - startY) * normY;
        const pushSide = sideDot >= 0 ? -1.0 : 1.0; // push to opposite side of center

        // Apply smooth tangent arc deflection for all points inside or near the clearance circle
        for (let i = 0; i <= stepsCount; i++) {
          const nom = nominalPts[i];
          const dToObs = Math.hypot(nom.x - obs.x, nom.y - obs.y);

          if (dToObs < minClearance) {
            // Calculate how deep into the obstacle zone this point is (0 at edge, 1 at center)
            const penetration = (minClearance - dToObs) / minClearance;
            // Push consistently along the perpendicular normal so path wraps smoothly around exterior
            const shiftAmount = (minClearance - distToCenter + 0.3) * (1 - Math.pow(1 - penetration, 2));

            const newX = Number((nom.x + normX * pushSide * shiftAmount).toFixed(2));
            const newY = Number((nom.y + normY * pushSide * shiftAmount).toFixed(2));
            const cDist = Number(Math.hypot(newX - nom.x, newY - nom.y).toFixed(2));

            correctedPts[i].x = newX;
            correctedPts[i].y = newY;
            correctedPts[i].corrected = true;
            correctedPts[i].corrDist = cDist;
            totalCorrectionDistance += cDist;
          }
        }
      }
    }

    // 3. Assemble steps with risk levels
    for (let i = 0; i <= stepsCount; i++) {
      const nom = nominalPts[i];
      const corr = correctedPts[i];

      let stepMinDist = Infinity;
      for (const obs of obstacles) {
        const d = Math.hypot(corr.x - obs.x, corr.y - obs.y) - obs.radius;
        if (d < stepMinDist) stepMinDist = d;
      }

      let stepRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';
      if (stepMinDist < 0.3) stepRisk = 'CRITICAL';
      else if (stepMinDist < 0.6) stepRisk = 'HIGH';
      else if (stepMinDist < 1.0) stepRisk = 'MEDIUM';
      else if (stepMinDist < 1.5) stepRisk = 'LOW';

      if (riskRank[stepRisk] > riskRank[maxRiskLevel]) {
        maxRiskLevel = stepRisk;
      }

      steps.push({
        nominal: { x: nom.x, y: nom.y, z: 0 },
        corrected: { x: corr.x, y: corr.y, z: 0 },
        correctedFlag: corr.corrected,
        risk: stepRisk,
        correctionDistance: corr.corrDist
      });
    }

    return {
      steps,
      wasCorrected,
      maxRiskLevel,
      totalCorrectionDistance: Number(totalCorrectionDistance.toFixed(2)),
      activeObstacle: activeObs,
      obstacles,
      safetyMode: mode,
      timestamp: new Date().toISOString()
    };
  };

  const dispatchTargetCoordinates = async (targetX: number, targetY: number, mode?: 'FASTEST' | 'SAFEST') => {
    const selectedMode = mode || data.safetyMode;
    setIsCalling(true);

    let parsed: TrajectoryData | null = null;

    try {
      // 1. Try MCP tool call if running inside an iframe host
      try {
        const callToolPromise = callTool('execute_safe_movement', {
          targetX,
          targetY,
          safetyMode: selectedMode,
          metadata: { 'x-api-key': 'nitroguard-secret-key' }
        });
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 200));
        const res = (await Promise.race([callToolPromise, timeoutPromise])) as any;

        if (res && !res.isError) {
          if (res.structuredContent) {
            parsed = res.structuredContent as TrajectoryData;
          } else if (typeof res.result === 'string') {
            try { parsed = JSON.parse(res.result); } catch {}
          }
        }
      } catch {
        // Standalone preview mode — fallback to local math
      }

      // 2. Local CBF computation fallback
      if (!parsed) {
        parsed = computeLocalCBF(currentCoords.x, currentCoords.y, targetX, targetY, selectedMode);
      }

      setLocalOutput(parsed);
      const lastStep = parsed.steps[parsed.steps.length - 1];
      if (lastStep) {
        setCurrentCoords(lastStep.corrected);
      }

      // 3. ALWAYS dispatch HTTP command directly to MuJoCo Python Bridge
      const finalX = lastStep ? lastStep.corrected.x : targetX;
      const finalY = lastStep ? lastStep.corrected.y : targetY;
      const speed = selectedMode === 'SAFEST' ? 0.6 : 1.2;

      for (const port of [8000, 8001]) {
        try {
          await fetch(`http://localhost:${port}/apply_command`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetX: finalX,
              targetY: finalY,
              waypoints: parsed ? parsed.steps.map((s) => s.corrected) : [],
              linearVelocity: speed,
              angularVelocity: 0.0,
              nstep: 20
            })
          });
          break;
        } catch {}
      }

      return parsed;
    } catch (err) {
      console.error(err);
      const fallback = computeLocalCBF(currentCoords.x, currentCoords.y, targetX, targetY, selectedMode);
      setLocalOutput(fallback);
      return fallback;
    } finally {
      setIsCalling(false);
      setClickIndicator(null);
    }
  };

  const handleGridClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    if (estopActive || isCalling) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let targetX = 0;
    let targetY = 0;

    if (viewType === '2D') {
      const padding = 30;
      const size = 340;
      targetX = Number((((clickX - padding) / size) * 15).toFixed(2));
      targetY = Number(((15 - ((clickY - padding) / size) * 15)).toFixed(2));
    } else {
      const svgX = clickX - 200;
      const svgY = clickY - 180;
      const cos30 = Math.cos(Math.PI / 6);
      const sin30 = Math.sin(Math.PI / 6);

      const rx = (svgX / cos30 + svgY / sin30) / 2;
      const ry = (svgY / sin30 - svgX / cos30) / 2;

      targetX = Number((rx / 16 + 7.5).toFixed(2));
      targetY = Number((ry / 16 + 7.5).toFixed(2));
    }

    targetX = Math.max(0, Math.min(15, targetX));
    targetY = Math.max(0, Math.min(15, targetY));

    setClickIndicator({ x: clickX, y: clickY });
    // All 3 ways go through LLM (Llama 3)
    await handleSendChat(`Navigate AMR-01 to clicked coordinate target (${targetX}, ${targetY})`);
  };

  const handleSendChat = async (customText?: string) => {
    const textToSend = customText || promptInput;
    if (!textToSend.trim() || isCalling || estopActive) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!customText) setPromptInput('');

    // ALWAYS show Llama thinking state for all inputs
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: textToSend, time: timeStr },
      { sender: 'assistant', text: '🧠 Llama is thinking & planning trajectory... ⏳', time: timeStr }
    ]);

    let targetX = 2.0;
    let targetY = 2.0;
    let llamaReasoning = 'Navigating to specified coordinates';
    let usedLlama = false;
    const lower = textToSend.toLowerCase();

    // Query Llama 3 (Ollama API) grounded in live MCP Resources
    try {
      const systemPrompt = `You are an AI AMR Navigation Planner for a 15x15m factory workspace.

[MCP Resource Loaded: sim://factory-layout]
Grid dimensions: 0-15m x 0-15m
Machine Centers:
- Press Cell A: (5.0, 5.0)
- High Voltage Cabinet: (10.0, 3.0)
- Automated Gantry/Conveyor: (7.0, 11.0)
- Home Base: (2.0, 2.0)

[MCP Resource Loaded: sim://obstacle-map]
Real-time hazard zones & circular physical barriers:
- Press Cell A: center (5.0, 5.0), radius 2.0m, safety margin 0.5m (clearance 2.5m)
- High Voltage Cabinet: center (10.0, 3.0), radius 1.5m, safety margin 0.5m (clearance 2.0m)
- Automated Gantry: center (7.0, 11.0), radius 2.2m, safety margin 0.5m (clearance 2.7m)

[MCP Resource Loaded: sim://robot-state]
Current AMR Pose: (${currentCoords.x.toFixed(2)}, ${currentCoords.y.toFixed(2)}, z=0.3)
Control Mode: ${data.safetyMode}

User prompt: "${textToSend}"

Instructions:
1. Parse the user prompt and extract target coordinates.
2. If exact numbers are given, output those exact numbers as targetX and targetY.
3. If a named machine is requested, output its raw center location (e.g. 5.0, 5.0 for Press Cell A).
   NitroGuard's live Control Barrier Function (CBF) engine will intercept the raw target downstream and calculate the safe boundary vector.

Respond ONLY with valid JSON in this exact format:
{"targetX": 2.0, "targetY": 2.0, "reasoning": "short sentence describing mission intent"}`;

      const ollamaRes = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3', prompt: systemPrompt, stream: false })
      });

      if (ollamaRes.ok) {
        const json = await ollamaRes.json();
        const jsonMatch = (json.response || '').match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.targetX !== undefined && parsed.targetY !== undefined) {
            targetX = Math.max(0, Math.min(15, parseFloat(parsed.targetX)));
            targetY = Math.max(0, Math.min(15, parseFloat(parsed.targetY)));
            llamaReasoning = parsed.reasoning || 'Goal selected by Llama planner';
            usedLlama = true;
          }
        }
      }
    } catch {
      // Fallback parser if Ollama service is unreachable
      if (lower.includes('start') || lower.includes('charging') || lower.includes('home')) {
        targetX = 2.0; targetY = 2.0;
      } else if (lower.includes('press')) {
        targetX = 5.0; targetY = 5.0;
      } else if (lower.includes('cabinet') || lower.includes('voltage')) {
        targetX = 10.0; targetY = 3.0;
      } else if (lower.includes('conveyor') || lower.includes('gantry')) {
        targetX = 7.0; targetY = 11.0;
      } else {
        const numMatches = textToSend.match(/(-?\d+\.?\d*)/g);
        if (numMatches && numMatches.length >= 2) {
          targetX = Math.max(0, Math.min(15, parseFloat(numMatches[0])));
          targetY = Math.max(0, Math.min(15, parseFloat(numMatches[1])));
        }
      }
    }

    let targetMode = data.safetyMode;
    if (lower.includes('safest')) targetMode = 'SAFEST';
    if (lower.includes('fastest')) targetMode = 'FASTEST';

    const result = await dispatchTargetCoordinates(targetX, targetY, targetMode);
    const reasoningText = llamaReasoning ? ` [Llama: "${llamaReasoning}"]` : '';
    const prefix = usedLlama ? '🦙 Llama planned' : '📍 Direct target';

    setChatMessages((prev) => {
      const filtered = prev.filter((m) => !m.text.includes('thinking & planning'));
      return [
        ...filtered,
        {
          sender: 'assistant',
          text: `${prefix} (${targetX}, ${targetY}) [${targetMode}].${reasoningText} Interception: ${result?.wasCorrected ? 'Deflected by CBF Vector' : 'Path Clear'}.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    });
  };

  const toggleSafetyMode = async () => {
    if (estopActive || isCalling) return;
    setIsCalling(true);
    const newMode = data.safetyMode === 'FASTEST' ? 'SAFEST' : 'FASTEST';

    try {
      const res = await callTool('execute_safe_movement', {
        targetX: currentCoords.x,
        targetY: currentCoords.y,
        targetZ: viewType === '3D' ? currentCoords.z : undefined,
        safetyMode: newMode,
        metadata: {
          'x-api-key': 'nitroguard-secret-key'
        }
      });

      if (res && !res.isError) {
        let parsed: TrajectoryData | null = null;
        if (res.structuredContent) {
          parsed = res.structuredContent as TrajectoryData;
        } else if (typeof res.result === 'string') {
          try {
            parsed = JSON.parse(res.result);
          } catch {}
        }
        if (parsed) {
          setLocalOutput(parsed);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalling(false);
    }
  };

  const triggerEstop = async () => {
    setIsCalling(true);
    const targetState = !estopActive;
    try {
      const res = await callTool('emergency_stop', {
        active: targetState,
        metadata: {
          'x-api-key': 'nitroguard-secret-key'
        }
      });
      if (res && !res.isError) {
        setEstopActive(targetState);
        // Clear speed when stopping
        if (targetState && localOutput) {
          setLocalOutput({
            ...localOutput,
            steps: localOutput.steps.map(s => ({ ...s, risk: 'NONE' })),
            maxRiskLevel: 'NONE'
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalling(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      case 'LOW': return '#3b82f6';
      default: return '#10b981';
    }
  };

  const isDark = theme === 'dark' || true; // Force premium dark layout
  const activeMargin = data.safetyMode === 'SAFEST' ? 1.0 : 0.5;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: '850px',
      margin: '0 auto',
      background: 'radial-gradient(circle at 10% 20%, #111827 0%, #030712 100%)',
      borderRadius: '24px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative'
    }}>
      {/* Glow Effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: '10%',
        width: '200px',
        height: '200px',
        background: estopActive ? 'rgba(239, 68, 68, 0.15)' : data.wasCorrected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(16, 185, 129, 0.1)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }}></div>

      {/* Top Banner Status Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: estopActive ? '#ef4444' : '#10b981',
            boxShadow: estopActive ? '0 0 10px #ef4444' : '0 0 10px #10b981',
            animation: 'pulse 2s infinite'
          }}></div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              NitroGuard Ops Console
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
              AI Execution Gateway • Upstream safety Interceptor
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          background: estopActive 
            ? 'rgba(239, 68, 68, 0.15)' 
            : data.wasCorrected 
              ? 'rgba(249, 115, 22, 0.15)' 
              : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${estopActive ? 'rgba(239,68,68,0.3)' : data.wasCorrected ? 'rgba(249,115,22,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: estopActive ? '#fca5a5' : data.wasCorrected ? '#fdba74' : '#6ee7b7',
          boxShadow: estopActive 
            ? '0 0 15px rgba(239,68,68,0.1)' 
            : data.wasCorrected 
              ? '0 0 15px rgba(249,115,22,0.1)' 
              : '0 0 15px rgba(16,185,129,0.05)'
        }}>
          {estopActive ? '⚠️ EMERGENCY ESTOP ACTIVE' : data.wasCorrected ? '⚠️ CBF WAYPOINT DEFLECTED' : '✅ NOMINAL PATH SAFE'}
        </div>
      </div>

      {/* Main View Area */}
      <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
        
        {/* SVG Tactical Display */}
        <div style={{
          flex: '1 1 400px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          position: 'relative'
        }}>
          {estopActive && (
            <div style={{
              position: 'absolute',
              top: 0, paddingTop: '100px',
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>🔴</span>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#f87171' }}>System Locked</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Clear ESTOP override to resume navigation</p>
            </div>
          )}

          <svg
            width="400"
            height="400"
            onClick={handleGridClick}
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              cursor: estopActive || isCalling ? 'not-allowed' : 'crosshair',
              boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Grid Lines */}
            {Array.from({ length: 16 }).map((_, i) => {
              if (viewType === '2D') {
                const startX = project2D(i, 0);
                const endX = project2D(i, 15);
                const startY = project2D(0, i);
                const endY = project2D(15, i);

                return (
                  <React.Fragment key={i}>
                    <line x1={startX.x} y1={startX.y} x2={endX.x} y2={endX.y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1={startY.x} y1={startY.y} x2={endY.x} y2={endY.y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  </React.Fragment>
                );
              } else {
                const startX = project3D(i, 0);
                const endX = project3D(i, 15);
                const startY = project3D(0, i);
                const endY = project3D(15, i);

                return (
                  <React.Fragment key={i}>
                    <line x1={startX.x} y1={startX.y} x2={endX.x} y2={endX.y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1={startY.x} y1={startY.y} x2={endY.x} y2={endY.y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  </React.Fragment>
                );
              }
            })}

            {/* Radar Circular rings (2D View only) */}
            {viewType === '2D' && [5, 10].map((radiusVal) => {
              const center = project2D(7.5, 7.5);
              const rMapped = (radiusVal / 15) * 340;
              return (
                <circle
                  key={radiusVal}
                  cx={center.x}
                  cy={center.y}
                  r={rMapped}
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.05)"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                />
              );
            })}

            {/* Render Detailed Visual Factory Equipment & Hazard Boundaries */}
            {data.obstacles.map((obs) => {
              const isViolated = data.wasCorrected && data.activeObstacle?.id === obs.id;

              if (viewType === '2D') {
                const pos = project2D(obs.x, obs.y);
                const radiusPixel = (obs.radius / 15) * 340;
                const marginPixel = (activeMargin / 15) * 340;
                const obsId = obs.id.toLowerCase();

                return (
                  <g key={obs.id}>
                    {/* Glowing CBF Safety Clearance Boundary */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radiusPixel + marginPixel}
                      fill="none"
                      stroke={isViolated ? 'rgba(239, 68, 68, 0.3)' : 'rgba(249, 115, 22, 0.2)'}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />

                    {obsId.includes('press') ? (
                      /* Top-down 2D Hydraulic Press Structure */
                      <g>
                        {/* Workbench Base */}
                        <rect x={pos.x - 22} y={pos.y - 22} width="44" height="44" fill={isViolated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.1)'} stroke={isViolated ? '#ef4444' : '#f97316'} strokeWidth="1.5" rx="4" />
                        {/* Corner Pillars */}
                        <circle cx={pos.x - 16} cy={pos.y - 16} r="3" fill="#f8fafc" />
                        <circle cx={pos.x + 16} cy={pos.y - 16} r="3" fill="#f8fafc" />
                        <circle cx={pos.x - 16} cy={pos.y + 16} r="3" fill="#f8fafc" />
                        <circle cx={pos.x + 16} cy={pos.y + 16} r="3" fill="#f8fafc" />
                        {/* Press Head Block */}
                        <rect x={pos.x - 12} y={pos.y - 12} width="24" height="24" fill={isViolated ? '#ef4444' : '#ea580c'} rx="2" />
                        <text x={pos.x} y={pos.y + 34} fill="#fdba74" fontSize="9" fontWeight="700" textAnchor="middle">PRESS CELL A</text>
                      </g>
                    ) : obsId.includes('cabinet') ? (
                      /* Top-down 2D High Voltage Electrical Cabinet */
                      <g>
                        <rect x={pos.x - 18} y={pos.y - 24} width="36" height="48" fill={isViolated ? 'rgba(239, 68, 68, 0.2)' : 'rgba(220, 38, 38, 0.15)'} stroke={isViolated ? '#ef4444' : '#dc2626'} strokeWidth="1.5" rx="4" />
                        <line x1={pos.x - 18} y1={pos.y} x2={pos.x + 18} y2={pos.y} stroke="#f87171" strokeWidth="1" strokeDasharray="2 2" />
                        {/* HMI Status Light */}
                        <circle cx={pos.x - 10} cy={pos.y - 14} r="3" fill="#38bdf8" />
                        <text x={pos.x} y={pos.y + 36} fill="#fca5a5" fontSize="9" fontWeight="700" textAnchor="middle">HV CABINET</text>
                      </g>
                    ) : (
                      /* Top-down 2D Automated Conveyor Belt */
                      <g>
                        <rect x={pos.x - 34} y={pos.y - 14} width="68" height="28" fill={isViolated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.12)'} stroke={isViolated ? '#ef4444' : '#eab308'} strokeWidth="1.5" rx="4" />
                        {/* Roller Strips */}
                        <line x1={pos.x - 20} y1={pos.y - 14} x2={pos.x - 20} y2={pos.y + 14} stroke="#fde047" strokeWidth="1" />
                        <line x1={pos.x} y1={pos.y - 14} x2={pos.x} y2={pos.y + 14} stroke="#fde047" strokeWidth="1" />
                        <line x1={pos.x + 20} y1={pos.y - 14} x2={pos.x + 20} y2={pos.y + 14} stroke="#fde047" strokeWidth="1" />
                        <text x={pos.x} y={pos.y + 26} fill="#fde047" fontSize="9" fontWeight="700" textAnchor="middle">CONVEYOR GANTRY</text>
                      </g>
                    )}
                  </g>
                );
              } else {
                /* 3D Isometric View Equipment Render */
                const posBottom = project3D(obs.x, obs.y, 0);
                const posTop = project3D(obs.x, obs.y, 1.5);
                const radiusPixel = obs.radius * 16;
                const marginPixel = activeMargin * 16;

                return (
                  <g key={obs.id}>
                    {/* Floor Safety Circle */}
                    <ellipse
                      cx={posBottom.x}
                      cy={posBottom.y}
                      rx={(radiusPixel + marginPixel) * Math.cos(Math.PI / 6)}
                      ry={(radiusPixel + marginPixel) * Math.sin(Math.PI / 6)}
                      fill="none"
                      stroke={isViolated ? 'rgba(239, 68, 68, 0.25)' : 'rgba(249, 115, 22, 0.15)'}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />

                    {/* 3D Vertical Pillar Structural Lines */}
                    <line x1={posBottom.x - 16} y1={posBottom.y} x2={posTop.x - 16} y2={posTop.y} stroke={isViolated ? '#ef4444' : '#f97316'} strokeWidth="1.5" />
                    <line x1={posBottom.x + 16} y1={posBottom.y} x2={posTop.x + 16} y2={posTop.y} stroke={isViolated ? '#ef4444' : '#f97316'} strokeWidth="1.5" />

                    {/* Elevated 3D Top Machine Block */}
                    <ellipse
                      cx={posTop.x}
                      cy={posTop.y}
                      rx={radiusPixel * Math.cos(Math.PI / 6)}
                      ry={radiusPixel * Math.sin(Math.PI / 6)}
                      fill={isViolated ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.15)'}
                      stroke={isViolated ? '#ef4444' : '#f97316'}
                      strokeWidth="2"
                    />
                    <text x={posTop.x} y={posTop.y - 12} fill="#fdba74" fontSize="9" fontWeight="700" textAnchor="middle">
                      {obs.label || 'Machine Cell'}
                    </text>
                  </g>
                );
              }
            })}

            {/* Path Steps Visualizations */}
            {data.steps && data.steps.length > 0 && data.steps.map((step, idx) => {
              if (idx === 0) return null;
              const prev = data.steps[idx - 1];

              const ptNomPrev = viewType === '2D' ? project2D(prev.nominal.x, prev.nominal.y) : project3D(prev.nominal.x, prev.nominal.y, prev.nominal.z);
              const ptNomCurr = viewType === '2D' ? project2D(step.nominal.x, step.nominal.y) : project3D(step.nominal.x, step.nominal.y, step.nominal.z);

              const ptSafePrev = viewType === '2D' ? project2D(prev.corrected.x, prev.corrected.y) : project3D(prev.corrected.x, prev.corrected.y, prev.corrected.z);
              const ptSafeCurr = viewType === '2D' ? project2D(step.corrected.x, step.corrected.y) : project3D(step.corrected.x, step.corrected.y, step.corrected.z);

              return (
                <g key={idx}>
                  {/* Nominal Path (Dashed Red Line) */}
                  <line
                    x1={ptNomPrev.x}
                    y1={ptNomPrev.y}
                    x2={ptNomCurr.x}
                    y2={ptNomCurr.y}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.4"
                  />
                  {/* Corrected Path (Solid Green Line) */}
                  <line
                    x1={ptSafePrev.x}
                    y1={ptSafePrev.y}
                    x2={ptSafeCurr.x}
                    y2={ptSafeCurr.y}
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    shadow-color="#10b981"
                    shadow-blur="4"
                  />
                  {/* Deflection Offset Line (if deflected) */}
                  {step.correctedFlag && (
                    <line
                      x1={ptNomCurr.x}
                      y1={ptNomCurr.y}
                      x2={ptSafeCurr.x}
                      y2={ptSafeCurr.y}
                      stroke="#f97316"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                  )}
                  {/* Nominal Waypoint Dot */}
                  <circle cx={ptNomCurr.x} cy={ptNomCurr.y} r="2" fill="#ef4444" opacity="0.6" />
                  {/* Corrected Waypoint Dot */}
                  <circle
                    cx={ptSafeCurr.x}
                    cy={ptSafeCurr.y}
                    r={idx === data.steps.length - 1 ? '5' : '3'}
                    fill={step.correctedFlag ? '#f97316' : '#10b981'}
                    style={{ transition: 'all 0.3s ease' }}
                  />
                </g>
              );
            })}

            {/* Click/Calling Load Indicator */}
            {isCalling && clickIndicator && (
              <g>
                <circle cx={clickIndicator.x} cy={clickIndicator.y} r="15" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="5;20" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx={clickIndicator.x} cy={clickIndicator.y} r="3" fill="#6366f1" />
              </g>
            )}

            {/* Robot start position node */}
            {data.steps && data.steps.length > 0 && (() => {
              const startPos = data.steps[0].corrected;
              const pos = viewType === '2D' ? project2D(startPos.x, startPos.y) : project3D(startPos.x, startPos.y, startPos.z);
              return (
                <g>
                  <circle cx={pos.x} cy={pos.y} r="6" fill="#10b981" />
                  <circle cx={pos.x} cy={pos.y} r="10" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.6" />
                  <text x={pos.x - 12} y={pos.y - 12} fill="#94a3b8" fontSize="10" fontWeight="bold">START</text>
                </g>
              );
            })()}

            {/* Current Position Node */}
            {data.steps && data.steps.length > 0 && (() => {
              const finalPos = data.steps[data.steps.length - 1].corrected;
              const pos = viewType === '2D' ? project2D(finalPos.x, finalPos.y) : project3D(finalPos.x, finalPos.y, finalPos.z);
              return (
                <g>
                  <circle cx={pos.x} cy={pos.y} r="7" fill="#60a5fa" />
                  <text x={pos.x + 12} y={pos.y + 4} fill="#60a5fa" fontSize="10" fontWeight="bold">AMR-09</text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Console control / telemetry drawer */}
        <div style={{
          flex: '1 1 320px',
          padding: '24px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Telemetry
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setViewType('2D')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: viewType === '2D' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: viewType === '2D' ? '#818cf8' : '#64748b',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  2D Map
                </button>
                <button
                  onClick={() => setViewType('3D')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: viewType === '3D' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: viewType === '3D' ? '#818cf8' : '#64748b',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  3D Iso
                </button>
              </div>
            </div>

            {/* Telemetry Items */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                padding: '10px'
              }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ROBOT POSITION</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  X: {currentCoords.x.toFixed(1)}, Y: {currentCoords.y.toFixed(1)}, Z: {currentCoords.z.toFixed(1)}
                </span>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                padding: '10px'
              }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>SAFETY MARGIN</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', color: '#fdba74' }}>
                  {activeMargin.toFixed(1)} m
                </span>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                padding: '10px'
              }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>MAX SPEED LIMIT</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', color: '#38bdf8' }}>
                  {data.safetyMode === 'SAFEST' ? '0.6 m/s' : '1.2 m/s'}
                </span>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '10px',
                padding: '10px'
              }}>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '4px' }}>TRAJECTORY RISK</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: getRiskColor(data.maxRiskLevel)
                }}>
                  {data.maxRiskLevel}
                </span>
              </div>
            </div>

            {/* Obstacle info */}
            {data.wasCorrected && data.activeObstacle && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>
                  CBF Upstream Interception Active
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  A collision vector was deflected away from the <strong>{data.activeObstacle.label || 'Obstacle'}</strong> by <strong>{data.totalCorrectionDistance}m</strong>.
                </p>
              </div>
            )}
          </div>

          {/* LLM Agent Chat Box */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.04em' }}>
                💬 LLM MISSION CHAT
              </span>
              <span style={{ fontSize: '9px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 6px', borderRadius: '4px' }}>
                Ollama / NitroStack
              </span>
            </div>

            {/* Chat messages scroll box */}
            <div style={{
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px'
            }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: msg.sender === 'user' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  maxWidth: '90%',
                  fontSize: '11px',
                  color: msg.sender === 'user' ? '#c7d2fe' : '#cbd5e1'
                }}>
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Quick suggestion chips */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSendChat('Move AMR-01 to Press Cell A (5, 5)')}
                disabled={isCalling || estopActive}
                style={{
                  fontSize: '9px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  cursor: 'pointer'
                }}
              >
                🎯 Press Cell (5, 5)
              </button>
              <button
                onClick={() => handleSendChat('Move to High Voltage Cabinet (10, 3)')}
                disabled={isCalling || estopActive}
                style={{
                  fontSize: '9px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  cursor: 'pointer'
                }}
              >
                ⚡ Cabinet (10, 3)
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="e.g. Move to (5.2, 5.5) SAFEST"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={isCalling || estopActive}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={isCalling || estopActive || !promptInput.trim()}
                style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </form>
          </div>

          {/* Action Controllers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {/* Mode Switcher Toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Safety Mode Priority</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {data.safetyMode === 'SAFEST' ? 'SAFEST (Low Speed, Large Clearance)' : 'FASTEST (High Speed, Tight Margin)'}
                </span>
              </div>
              <button
                onClick={toggleSafetyMode}
                disabled={estopActive || isCalling}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: isCalling ? 'rgba(255,255,255,0.05)' : data.safetyMode === 'FASTEST' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: data.safetyMode === 'FASTEST' ? '#34d399' : '#a5b4fc',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: estopActive || isCalling ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {data.safetyMode}
              </button>
            </div>

            {/* ESTOP Lock override */}
            <button
              onClick={triggerEstop}
              disabled={isCalling}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: estopActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: estopActive ? '#34d399' : '#f87171',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: estopActive ? '0 0 10px rgba(16,185,129,0.1)' : '0 0 10px rgba(239,68,68,0.1)'
              }}
            >
              {estopActive ? '🔓 RESET EMERGENCY ESTOP LOCK' : '🔴 TRIGGER EMERGENCY ESTOP SHUTDOWN'}
            </button>
          </div>
        </div>

      </div>

      {/* Footer info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 24px',
        fontSize: '10px',
        color: '#64748b',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <span>💡 Click grid to test coordinate trajectory deflection.</span>
        <span>Theme: {theme || 'dark'}</span>
      </div>
    </div>
  );
}
