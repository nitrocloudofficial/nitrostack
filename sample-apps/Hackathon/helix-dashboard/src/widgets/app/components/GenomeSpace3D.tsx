'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DepartmentDrift } from '../data/mockData';
import { X, Orbit } from 'lucide-react';

interface GenomeSpace3DProps {
  departments: DepartmentDrift[];
}

interface Edge3D {
  sourceId: string;
  targetId: string;
  label: string;
  traffic: 'low' | 'normal' | 'high';
}

export const GenomeSpace3D: React.FC<GenomeSpace3DProps> = ({ departments }) => {
  // Navigation / Camera State
  const [yaw, setYaw] = useState<number>(45); // horizontal angle in degrees
  const [pitch, setPitch] = useState<number>(25); // vertical angle in degrees
  const [zoom, setZoom] = useState<number>(1.15); // scale factor
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Drag interaction state
  const isDragging = useRef<boolean>(false);
  const prevMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    const tick = () => {
      setYaw((prev) => (prev + 0.25) % 360);
      animationFrameId.current = requestAnimationFrame(tick);
    };

    animationFrameId.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [autoRotate]);

  // Handle Dragging to Rotate
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false); // Pause auto-rotation on user drag
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - prevMousePos.current.x;
    const deltaY = e.clientY - prevMousePos.current.y;

    setYaw((prev) => (prev + deltaX * 0.5) % 360);
    setPitch((prev) => Math.max(-80, Math.min(80, prev - deltaY * 0.5)));

    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Base 4-vector genome coordinates mapped from [0, 1] dimensions
  // S = Strategic Alignment (X-axis)
  // P = Process Consistency (Y-axis)
  // C = Conceptual Cohesion (Z-axis)
  // M = Memory Retention (Sphere size & glow pulse)
  const genomeData = useMemo(() => {
    const baseMappings: Record<string, { s: number; p: number; c: number; m: number }> = {
      'dept-eng': { s: 0.65, p: 0.50, c: 0.78, m: 0.45 },
      'dept-prod': { s: 0.78, p: 0.84, c: 0.68, m: 0.70 },
      'dept-leg': { s: 0.60, p: 0.75, c: 0.81, m: 0.85 },
      'dept-sales': { s: 0.90, p: 0.88, c: 0.75, m: 0.88 },
      'dept-mkt': { s: 0.95, p: 0.92, c: 0.84, m: 0.94 },
    };

    return departments.map((d) => {
      const base = baseMappings[d.id] || { s: 0.75, p: 0.75, c: 0.75, m: 0.75 };
      // Make coordinates reactive to live drift values!
      const driftPenalty = d.driftScore * 0.12;
      const s = Math.max(0.1, base.s - driftPenalty);
      const p = Math.max(0.1, base.p - driftPenalty);
      const c = d.cohesionIndex / 100;
      const m = base.m;

      return {
        ...d,
        s,
        p,
        c,
        m,
      };
    });
  }, [departments]);

  // Edges defining relationships and data pipelines
  const edges: Edge3D[] = useMemo(() => [
    { sourceId: 'dept-eng', targetId: 'dept-prod', label: 'Product Specs & Telemetry', traffic: 'high' },
    { sourceId: 'dept-prod', targetId: 'dept-mkt', label: 'GTM Launches', traffic: 'normal' },
    { sourceId: 'dept-mkt', targetId: 'dept-sales', label: 'Lead Funnel Sync', traffic: 'high' },
    { sourceId: 'dept-sales', targetId: 'dept-leg', label: 'SLA & Pricing Audits', traffic: 'low' },
    { sourceId: 'dept-leg', targetId: 'dept-eng', label: 'SOC2 & Policy Gates', traffic: 'low' },
    { sourceId: 'dept-eng', targetId: 'dept-sales', label: 'Tech Capability Loop', traffic: 'normal' },
    { sourceId: 'dept-prod', targetId: 'dept-leg', label: 'Regulatory Compliance', traffic: 'normal' },
  ], []);

  const selectedDept = useMemo(() => {
    return genomeData.find((d) => d.id === selectedDeptId) || null;
  }, [genomeData, selectedDeptId]);

  // Click handler for node selection (zooms in & centers)
  const handleNodeClick = (deptId: string) => {
    setSelectedDeptId(deptId);
    setAutoRotate(false);
    // Focus camera
    setZoom(1.6);
    setPitch(25);
  };

  const handleResetFocus = () => {
    setSelectedDeptId(null);
    setZoom(1.15);
    setPitch(25);
    setAutoRotate(true);
  };

  // Canvas details
  const width = 500;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  // 3D Projection Math
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;

  const project = (x: number, y: number, z: number) => {
    // Center inputs around (0.5, 0.5, 0.5) to balance around rotation center
    const cx = (x - 0.6) * 2;
    const cy = (y - 0.6) * 2;
    const cz = (z - 0.6) * 2;

    // 1. Yaw rotation (around Y axis)
    const x1 = cx * Math.cos(yawRad) - cz * Math.sin(yawRad);
    const z1 = cx * Math.sin(yawRad) + cz * Math.cos(yawRad);

    // 2. Pitch rotation (around X axis)
    const y2 = cy * Math.cos(pitchRad) - z1 * Math.sin(pitchRad);
    const z2 = cy * Math.sin(pitchRad) + z1 * Math.cos(pitchRad);

    // Camera perspective projection
    const cameraDistance = 3.5;
    const scale = cameraDistance / (cameraDistance - z2);

    // Magnification factor mapping coordinates to screen space
    const screenX = centerX + x1 * scale * 100 * zoom;
    const screenY = centerY - y2 * scale * 100 * zoom;

    return { x: screenX, y: screenY, zIndex: z2 };
  };

  // Generate 3D elements
  const renderElements = useMemo(() => {
    const list: any[] = [];

    // Subtle 3D Bounding Grid Box
    const corners = [
      [0.2, 0.2, 0.2], [1.0, 0.2, 0.2], [1.0, 1.0, 0.2], [0.2, 1.0, 0.2],
      [0.2, 0.2, 1.0], [1.0, 0.2, 1.0], [1.0, 1.0, 1.0], [0.2, 1.0, 1.0]
    ];
    
    // Draw wireframe box edges
    const boxConnections = [
      [0, 1], [1, 2], [2, 3], [3, 0], // back
      [4, 5], [5, 6], [6, 7], [7, 4], // front
      [0, 4], [1, 5], [2, 6], [3, 7]  // connectors
    ];

    boxConnections.forEach(([i1, i2], idx) => {
      const pt1 = project(...(corners[i1] as [number, number, number]));
      const pt2 = project(...(corners[i2] as [number, number, number]));
      list.push({
        type: 'grid',
        avgZ: (pt1.zIndex + pt2.zIndex) / 2,
        render: () => (
          <line
            key={`box-${idx}`}
            x1={pt1.x}
            y1={pt1.y}
            x2={pt2.x}
            y2={pt2.y}
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="0.8"
          />
        ),
      });
    });

    // S, P, C Axes lines starting from origin/center (0.2, 0.2, 0.2)
    const oPt = project(0.2, 0.2, 0.2);
    const sPt = project(1.1, 0.2, 0.2);
    const pPt = project(0.2, 1.1, 0.2);
    const cPt = project(0.2, 0.2, 1.1);

    list.push({
      type: 'axis',
      avgZ: oPt.zIndex - 0.1,
      render: () => (
        <g key="axes">
          {/* S axis */}
          <line x1={oPt.x} y1={oPt.y} x2={sPt.x} y2={sPt.y} stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x={sPt.x + 4} y={sPt.y + 4} fill="#00E5FF" fontSize="8" opacity="0.6">S (Align)</text>
          
          {/* P axis */}
          <line x1={oPt.x} y1={oPt.y} x2={pPt.x} y2={pPt.y} stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x={pPt.x - 4} y={pPt.y - 4} fill="#3B82F6" fontSize="8" opacity="0.6">P (Process)</text>
          
          {/* C axis */}
          <line x1={oPt.x} y1={oPt.y} x2={cPt.x} y2={cPt.y} stroke="rgba(236, 72, 153, 0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x={cPt.x - 8} y={cPt.y + 8} fill="#EC4899" fontSize="8" opacity="0.6">C (Cohesion)</text>
        </g>
      )
    });

    // Render Graph Edges (Node Connections)
    edges.forEach((edge, idx) => {
      const sourceNode = genomeData.find((n) => n.id === edge.sourceId);
      const targetNode = genomeData.find((n) => n.id === edge.targetId);

      if (!sourceNode || !targetNode) return;

      const pS = project(sourceNode.s, sourceNode.p, sourceNode.c);
      const pT = project(targetNode.s, targetNode.p, targetNode.c);

      // Edge status: Red/Amber if endpoints have high drift scores
      const avgDrift = (sourceNode.driftScore + targetNode.driftScore) / 2;
      let strokeColor = 'rgba(16, 185, 129, 0.25)'; // aligned green
      let glowColor = 'rgba(16, 185, 129, 0.1)';
      if (avgDrift > 0.5) {
        strokeColor = 'rgba(0, 229, 255, 0.45)'; // severe red
        glowColor = 'rgba(0, 229, 255, 0.2)';
      } else if (avgDrift > 0.25) {
        strokeColor = 'rgba(59, 130, 246, 0.4)'; // moderate amber
        glowColor = 'rgba(59, 130, 246, 0.15)';
      }

      // Edge animation speed based on traffic
      const speed = edge.traffic === 'high' ? '1.2s' : edge.traffic === 'low' ? '3.5s' : '2.2s';

      const isSelectedEdge = selectedDeptId === edge.sourceId || selectedDeptId === edge.targetId;

      list.push({
        type: 'edge',
        avgZ: (pS.zIndex + pT.zIndex) / 2,
        render: () => (
          <g key={`edge-${idx}`}>
            {/* Glowing pipeline tube background */}
            <line
              x1={pS.x}
              y1={pS.y}
              x2={pT.x}
              y2={pT.y}
              stroke={isSelectedEdge ? strokeColor.replace('0.25', '0.6').replace('0.45', '0.8').replace('0.4', '0.8') : strokeColor}
              strokeWidth={isSelectedEdge ? '4' : '2'}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
            />
            {/* Animated flowing data packets overlay */}
            <line
              x1={pS.x}
              y1={pS.y}
              x2={pT.x}
              y2={pT.y}
              stroke="#FFFFFF"
              strokeWidth={isSelectedEdge ? '2' : '1.2'}
              strokeDasharray="5, 10"
              strokeLinecap="round"
              style={{
                animation: `flowLine ${speed} linear infinite`,
                opacity: 0.85,
              }}
            />
          </g>
        ),
      });
    });

    // Render Graph Nodes (Departments)
    genomeData.forEach((dept) => {
      const pt = project(dept.s, dept.p, dept.c);

      let color = '#10B981'; // aligned
      if (dept.status === 'severe') {
        color = '#00E5FF';
      } else if (dept.status === 'moderate') {
        color = '#3B82F6';
      }

      const isSelected = dept.id === selectedDeptId;

      // Memory (M) governs base node size & scale
      const baseNodeRadius = 10;
      const nodeRadius = baseNodeRadius + (dept.m * 6); // size ranges from 10 to 16 based on memory

      list.push({
        type: 'node',
        avgZ: pt.zIndex + 0.05, // Render nodes slightly in front of their edges
        render: () => (
          <g
            key={`node-${dept.id}`}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(dept.id);
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Glowing outer aura */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={nodeRadius + (isSelected ? 9 : 5)}
              fill="none"
              stroke={color}
              strokeWidth={isSelected ? '3' : '1.5'}
              strokeOpacity={isSelected ? '0.95' : '0.45'}
              style={{
                filter: `drop-shadow(0 0 ${isSelected ? '10px' : '5px'} ${color})`,
                animation: isSelected ? 'pulseGlow 1.4s infinite' : 'none',
              }}
            />
            {/* Main sphere */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={nodeRadius}
              fill={`url(#sphereGrad-${dept.id})`}
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="0.8"
            />
            {/* Highlight bubble reflection */}
            <circle
              cx={pt.x - nodeRadius / 3}
              cy={pt.y - nodeRadius / 3}
              r={nodeRadius / 3}
              fill="rgba(255, 255, 255, 0.45)"
              filter="blur(0.5px)"
            />
            {/* Department Label Flag */}
            <g transform={`translate(${pt.x + nodeRadius + 5}, ${pt.y - 8})`}>
              <rect
                width={74}
                height={18}
                rx={5}
                fill="rgba(0, 0, 0, 0.88)"
                stroke={isSelected ? color : 'rgba(255, 255, 255, 0.18)'}
                strokeWidth="1"
              />
              <text x={6} y={12} fill="#F3F4F6" fontSize="9.5" fontWeight={isSelected ? 'bold' : '600'}>
                {dept.code} ({Math.round(dept.driftScore * 100)}%)
              </text>
            </g>

            {/* Gradient definition for sphere depth */}
            <defs>
              <radialGradient id={`sphereGrad-${dept.id}`} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                <stop offset="45%" stopColor={color} />
                <stop offset="100%" stopColor="#05070B" />
              </radialGradient>
            </defs>
          </g>
        ),
      });
    });

    // Sort by depth (zIndex desc) to render back elements first
    return list.sort((a, b) => b.avgZ - a.avgZ);
  }, [yaw, pitch, zoom, genomeData, selectedDeptId, edges]);

  return (
    <div style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap', minHeight: '440px', flex: 1, height: '100%' }}>
      {/* Dynamic keyframe CSS injected directly into DOM */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flowLine {
          to {
            stroke-dashoffset: -30;
          }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.06); opacity: 0.95; }
        }
      `}} />

      {/* Left Column: 3D Visualization */}
      <div
        style={{
          flex: '1 1 500px',
          minHeight: '430px',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          cursor: isDragging.current ? 'grabbing' : 'grab',
          overflow: 'hidden',
          backgroundColor: 'rgba(5, 5, 5, 0.5)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Holographic grid lines & labels background */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-pulse" style={{ backgroundColor: '#00E5FF' }} />
            Cognitive Graph Constellation
          </h4>
          <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>Drag to rotate • Click node to focus</span>
        </div>

        {/* 3D SVG Render viewport */}
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          {renderElements.map((el) => el.render())}
        </svg>

        {/* Control floating actions overlay */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
            <button
              onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.15))}
              style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '20px' }}
            >
              -
            </button>
            <span style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.15))}
              style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', width: '20px' }}
            >
              +
            </button>
          </div>

          {/* Auto Rotate & Reset */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              style={{
                fontSize: '11px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: autoRotate ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                border: autoRotate ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: autoRotate ? '#38BDF8' : '#A1A1AA',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Orbit size={14} />
              {autoRotate ? 'Rotate ON' : 'Rotate OFF'}
            </button>

            {selectedDeptId && (
              <button
                onClick={handleResetFocus}
                style={{
                  fontSize: '11px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Reset Focus
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Focused Details & Trend Sparkline */}
      <AnimatePresence mode="wait">
        {selectedDept ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              flex: '1 1 320px',
              height: '430px',
              backgroundColor: 'rgba(5, 5, 5, 0.6)',
              border: '1px solid rgba(0, 229, 255, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflowY: 'auto',
              boxShadow: 'inset 0 0 40px rgba(0, 229, 255, 0.03)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
              {/* Header info */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(0, 229, 255, 0.15)', color: '#38BDF8' }}>
                    {selectedDept.code}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{selectedDept.name}</h3>
                </div>
                <span style={{ fontSize: '12px', color: '#A1A1AA', display: 'block', marginTop: '6px', fontWeight: 500 }}>
                  Lead: {selectedDept.lead}
                </span>
              </div>

              {/* 4-Vector Metrics Dial Values */}
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  4-Vector Alignment
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {/* S Dial */}
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                    <span style={{ fontSize: '9px', color: '#00E5FF', fontWeight: 700, display: 'block' }}>STRATEGIC (S)</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>{(selectedDept.s * 100).toFixed(0)}%</span>
                  </div>
                  {/* P Dial */}
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '9px', color: '#3B82F6', fontWeight: 700, display: 'block' }}>PROCESS (P)</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>{(selectedDept.p * 100).toFixed(0)}%</span>
                  </div>
                  {/* C Dial */}
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <span style={{ fontSize: '9px', color: '#EC4899', fontWeight: 700, display: 'block' }}>COHESION (C)</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>{(selectedDept.c * 100).toFixed(0)}%</span>
                  </div>
                  {/* M Dial */}
                  <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <span style={{ fontSize: '9px', color: '#8B5CF6', fontWeight: 700, display: 'block' }}>MEMORY (M)</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>{(selectedDept.m * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Sparkline Graph for drift index */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    7-Day Behavioral Drift
                  </span>
                  <span style={{ fontSize: '11px', color: selectedDept.status === 'severe' ? '#00E5FF' : selectedDept.status === 'moderate' ? '#3B82F6' : '#10B981', fontWeight: 800 }}>
                    Current: {selectedDept.driftScore.toFixed(2)}
                  </span>
                </div>
                <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {/* Custom inline sparkline SVG */}
                  <svg width="100%" height="70" viewBox="0 0 200 70" style={{ overflow: 'visible' }}>
                    {(() => {
                      const data = selectedDept.trendHistory;
                      const max = Math.max(...data, 1);
                      const min = Math.min(...data, 0);
                      const pts = data.map((val, i) => {
                        const x = 10 + (i / (data.length - 1)) * 180;
                        const y = 60 - ((val - min) / (max - min)) * 50;
                        return { x, y };
                      });

                      const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const area = `${path} L ${pts[pts.length - 1].x} 70 L ${pts[0].x} 70 Z`;
                      const statusColor = selectedDept.status === 'severe' ? '#00E5FF' : selectedDept.status === 'moderate' ? '#3B82F6' : '#10B981';

                      return (
                        <g>
                          <defs>
                            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={statusColor} stopOpacity="0.4" />
                              <stop offset="100%" stopColor={statusColor} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path d={area} fill="url(#sparkGrad)" />
                          <path d={path} fill="none" stroke={statusColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          {pts.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#000" stroke={statusColor} strokeWidth="2" />
                          ))}
                        </g>
                      );
                    })()}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#A1A1AA', marginTop: '10px', fontWeight: 600 }}>
                    <span>Day -7</span>
                    <span>Day -4</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Actions panel */}
              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleResetFocus}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Close Inspection
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-panel"
            style={{
              flex: '1 1 320px',
              height: '430px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              textAlign: 'center',
              padding: '0 24px'
            }}
          >
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(0, 229, 255, 0.1)', border: '1px dashed rgba(0, 229, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#38BDF8' }}>
              <Orbit size={28} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>Interactive Inspection</h4>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#A1A1AA', lineHeight: '1.5', fontWeight: 500 }}>
                Select a floating department node in the 3D space to trigger high-resolution camera zoom and plot its 7-day cognitive drift history.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
