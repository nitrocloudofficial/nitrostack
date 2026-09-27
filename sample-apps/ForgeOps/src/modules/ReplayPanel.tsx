import { useEffect, useMemo, useState } from 'react';
import { useFocusContext } from '../FocusContext';
import { useWorkbenchData } from '../WorkbenchDataContext';

const formatDuration = (minute: number) => `${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, '0')}`;

export function ReplayPanel() {
  const { focus, focusStage, setPinned, setReplayTime } = useFocusContext();
  const { data } = useWorkbenchData();
  const { incidentEvents, replayStages } = data;
  const duration = Math.max(
    1,
    ...replayStages.map((stage) => stage.endMinute),
    ...incidentEvents.map((event) => event.offsetMinutes),
  );
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [overlay, setOverlay] = useState(true);

  useEffect(() => {
    if (!playing || focus.pinned) return;
    const timer = window.setInterval(() => {
      if (focus.timeMinute >= duration) {
        setPlaying(false);
        return;
      }
      setReplayTime(focus.timeMinute + Math.max(1, Math.round(speed * 3)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [duration, focus.pinned, focus.timeMinute, playing, setReplayTime, speed]);

  const activeStage = useMemo(
    () => replayStages.find((stage) => stage.id === focus.stageId) ?? replayStages[0],
    [focus.stageId],
  );
  const stageProgress = Math.min(100, (focus.timeMinute / duration) * 100);
  const activeEvent = incidentEvents.find((event) => event.id === focus.eventId);
  const activeStageAnomalies = incidentEvents.filter(
    (event) => activeStage.eventIds.includes(event.id)
      && (event.severity === 'warning' || event.severity === 'critical'),
  );
  const anomalyLabel = activeStageAnomalies.length
    ? `${activeStageAnomalies.length} anomal${activeStageAnomalies.length === 1 ? 'y' : 'ies'}`
    : 'No anomalies';
  const conditionLabel = activeStage.status === 'failure'
    ? 'Critical'
    : activeStage.status === 'warning'
      ? 'Warning'
      : 'Normal';

  return (
    <section className="module-panel replay-panel">
      <header className="module-header compact-header">
        <div>
          <h2>Replay production</h2>
          <span>Reconstruction from live MCP timeline · {formatDuration(duration)}</span>
        </div>
        <button className={`toggle-button${overlay ? ' active' : ''}`} onClick={() => setOverlay((value) => !value)} aria-pressed={overlay}>
          <i /> Anomaly overlay
        </button>
      </header>

      <div className="replay-viewport">
        <div className="replay-status-line">
          <span className={`replay-status ${playing ? 'playing' : ''}`}><i /> {playing ? 'Replaying' : focus.pinned ? 'Moment pinned' : 'Paused'}</span>
          <strong>{formatDuration(focus.timeMinute)} <small>/ {formatDuration(duration)}</small></strong>
          {activeEvent && <span>{activeEvent.label} · {activeEvent.value}</span>}
        </div>
        <div className="production-path">
          {replayStages.map((stage, index) => {
            const selected = focus.stageId === stage.id;
            const complete = focus.timeMinute >= stage.endMinute;
            return (
              <div className="path-segment" key={stage.id}>
                <button
                  className={`stage-node ${stage.status}${selected ? ' selected' : ''}${complete ? ' complete' : ''}`}
                  onClick={() => focusStage(stage.id)}
                  aria-pressed={selected}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <i />
                  <strong>{stage.shortLabel}</strong>
                  <small>{formatDuration(stage.startMinute)}</small>
                </button>
                {index < replayStages.length - 1 && <div className={`path-link${complete ? ' complete' : ''}`} />}
              </div>
            );
          })}
        </div>
        {overlay && (
          <div className={`reference-path ${activeStage.status}`}>
            <span>Stage condition</span>
            <div><i style={{ width: `${stageProgress}%` }} /></div>
            <strong>{anomalyLabel} · {conditionLabel}</strong>
          </div>
        )}
      </div>

      <div className="transport-controls">
        <button className="transport-button" onClick={() => { setPlaying(false); setPinned(false); setReplayTime(0); }} aria-label="Restart replay">↺</button>
        <button className="play-button" onClick={() => { setPinned(false); setPlaying((value) => !value); }} aria-label={playing ? 'Pause replay' : 'Play replay'}>
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <input
          className="replay-slider"
          type="range"
          min="0"
          max={duration}
          value={focus.timeMinute}
          onChange={(event) => { setPlaying(false); setPinned(false); setReplayTime(Number(event.target.value)); }}
          aria-label="Replay position"
        />
        <label className="speed-control">
          <span className="sr-only">Playback speed</span>
          <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </label>
        <button className={`pin-button${focus.pinned ? ' active' : ''}`} onClick={() => { setPlaying(false); setPinned(!focus.pinned); }} aria-pressed={focus.pinned}>
          ◉ {focus.pinned ? 'Pinned' : 'Pin moment'}
        </button>
      </div>

      <div className="stage-inspector">
        <div>
          <span>Focused stage</span>
          <h3>{activeStage.label}</h3>
          <p>{activeStage.summary}</p>
        </div>
        <div className="stage-metrics">
          {activeStage.metrics.map((metric) => (
            <span key={metric.label} className={metric.state ?? ''}>
              <small>{metric.label}</small>
              <strong>{metric.value}</strong>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
