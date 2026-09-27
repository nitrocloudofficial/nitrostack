'use client';

import { useWidgetSDK } from '@nitrostack/widgets';
import { useState, useEffect, useRef } from 'react';

export const dynamic = 'force-dynamic';

interface SimSnapshot {
  month: number;
  label: string;
  event: string;
  factoriesCount: number;
  matchesCount: number;
  productsCount: number;
  blueprintsCount: number;
  circularScore: number;
  totalCo2Avoided: number;
  totalLandfillDiverted: number;
  totalWaterSaved: number;
  totalFinancialValue: number;
  newFactoryName?: string;
  disruptedFactory?: string;
  affectedChains?: number;
}

interface SimulationData {
  success: boolean;
  simulation: {
    totalMonths: number;
    finalScore: number;
    factoriesAdded: number;
    totalMatches: number;
    totalProducts: number;
    totalBlueprints: number;
    disruption: boolean;
  };
  snapshots: SimSnapshot[];
}

export default function SymbioSimTimeline() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SimulationData>();

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapshots = data?.snapshots ?? [];
  const totalMonths = snapshots.length;

  useEffect(function() {
    if (data && data.snapshots && data.snapshots.length > 0 && currentIndex === -1) {
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [data, currentIndex]);

  useEffect(function() {
    if (isPlaying && currentIndex >= 0 && currentIndex < totalMonths - 1) {
      timerRef.current = setTimeout(function() {
        setCurrentIndex(function(prev) { return prev + 1; });
      }, 3000 / speed);
    } else if (currentIndex >= totalMonths - 1) {
      setIsPlaying(false);
    }
    return function() { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, currentIndex, speed, totalMonths]);

  if (!isReady) {
    return <div style={{ padding: 20, color: '#999' }}>Loading...</div>;
  }

  if (!data || !data.snapshots || data.snapshots.length === 0) {
    return (
      <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#0f172a', borderRadius: '12px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>SymbioSim Time Machine</div>
        <div style={{ fontSize: '12px', marginTop: '8px' }}>Run the run-simulation tool to start.</div>
      </div>
    );
  }

  var current = currentIndex >= 0 && currentIndex < totalMonths ? snapshots[currentIndex] : snapshots[0];
  var progress = totalMonths > 1 ? (currentIndex / (totalMonths - 1)) * 100 : 0;

  function getEventColor(event: string) {
    if (event === 'disruption') return '#ef4444';
    if (event === 'self_healed') return '#10b981';
    if (event === 'factory_joined') return '#3b82f6';
    return '#6366f1';
  }

  function getScoreColor(score: number) {
    if (score >= 60) return '#10b981';
    if (score >= 30) return '#f59e0b';
    return '#ef4444';
  }

  function handlePlayPause() {
    if (currentIndex >= totalMonths - 1) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  }

  function handleReset() {
    setIsPlaying(false);
    setCurrentIndex(0);
  }

  var eventIcon = current.event === 'disruption' ? 'WARNING' :
    current.event === 'self_healed' ? 'HEALED' :
    current.event === 'factory_joined' ? 'NEW' : 'UPDATE';

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      maxWidth: '900px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>SymbioSim Time Machine</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {data.simulation.totalMonths}-month ecosystem evolution | {data.simulation.factoriesAdded} factories | {data.simulation.totalMatches} symbioses
          </p>
        </div>
        <div style={{
          backgroundColor: '#1e293b', padding: '8px 16px', borderRadius: '8px',
          border: '2px solid ' + getScoreColor(current.circularScore), textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Circular Score</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: getScoreColor(current.circularScore) }}>{current.circularScore}%</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={handlePlayPause} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: isPlaying ? '#ef4444' : '#10b981',
          color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
        }}>
          {isPlaying ? 'II' : String.fromCharCode(9654)}
        </button>
        <button onClick={handleReset} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '32px', height: '32px', borderRadius: '50%',
          backgroundColor: '#475569', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px'
        }}>
          {String.fromCharCode(8634)}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>Speed:</span>
          {[0.5, 1, 2, 4].map(function(s) {
            return (
              <button key={s} onClick={function() { setSpeed(s); }} style={{
                padding: '3px 8px', fontSize: '10px', fontWeight: 'bold',
                backgroundColor: speed === s ? '#3b82f6' : '#1e293b',
                color: '#fff', border: '1px solid #334155', borderRadius: '4px', cursor: 'pointer'
              }}>
                {s}x
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '14px', fontWeight: 'bold', color: '#94a3b8' }}>
          Month <span style={{ color: '#fff', fontSize: '18px' }}>{current.month}</span> / {totalMonths}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div style={{ height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: progress + '%',
            backgroundColor: current.event === 'disruption' ? '#ef4444' : '#3b82f6',
            borderRadius: '4px', transition: 'width 0.5s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          {snapshots.map(function(snap, i) {
            return (
              <button key={i} onClick={function() { setCurrentIndex(i); setIsPlaying(false); }} style={{
                width: i === currentIndex ? '14px' : '10px',
                height: i === currentIndex ? '14px' : '10px',
                borderRadius: '50%',
                backgroundColor: i <= currentIndex ? getEventColor(snap.event) : '#334155',
                border: i === currentIndex ? '2px solid #fff' : 'none',
                cursor: 'pointer', transition: 'all 0.3s ease', padding: 0
              }} />
            );
          })}
        </div>
      </div>

      <div style={{
        padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
        backgroundColor: current.event === 'disruption' ? '#451a1a' : current.event === 'self_healed' ? '#052e1a' : '#1e293b',
        border: '1px solid ' + getEventColor(current.event),
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <div style={{
          padding: '4px 8px', borderRadius: '4px',
          backgroundColor: getEventColor(current.event),
          fontSize: '10px', fontWeight: 'bold', color: '#fff', flexShrink: 0
        }}>
          {eventIcon}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{current.label}</div>
          {current.disruptedFactory && (
            <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>
              {current.affectedChains} symbiotic chains affected
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Factories', value: current.factoriesCount, color: '#3b82f6' },
          { label: 'Symbioses', value: current.matchesCount, color: '#10b981' },
          { label: 'Products', value: current.productsCount, color: '#f59e0b' },
          { label: 'CO2 Avoided', value: current.totalCo2Avoided.toFixed(1) + ' t', color: '#06b6d4' },
          { label: 'Value', value: (current.totalFinancialValue / 100000).toFixed(1) + 'L', color: '#8b5cf6' }
        ].map(function(stat) {
          return (
            <div key={stat.label} style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold', color: '#94a3b8' }}>
          Circular Economy Score Progression
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
          {snapshots.map(function(snap, i) {
            var h = Math.max(4, (snap.circularScore / 100) * 80);
            var past = i <= currentIndex;
            var cur = i === currentIndex;
            var col = !past ? '#334155' :
              snap.event === 'disruption' ? '#ef4444' :
              snap.event === 'self_healed' ? '#10b981' : '#3b82f6';
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{
                  width: '100%', height: (past ? h : 4) + 'px',
                  backgroundColor: col, borderRadius: '2px 2px 0 0',
                  transition: 'height 0.5s ease, background-color 0.3s ease',
                  border: cur ? '1px solid #fff' : 'none',
                  opacity: past ? 1 : 0.3
                }} />
                <span style={{ fontSize: '8px', color: cur ? '#fff' : '#475569' }}>{snap.month}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9px', color: '#475569' }}>
          <span>Month 1</span>
          <span>Month {totalMonths}</span>
        </div>
      </div>
    </div>
  );
}
