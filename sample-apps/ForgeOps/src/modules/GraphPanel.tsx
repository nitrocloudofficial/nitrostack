import { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { useFocusContext } from '../FocusContext';
import { useWorkbenchData } from '../WorkbenchDataContext';

interface EdgeCoord {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function GraphPanel() {
  const { focus, focusGraphNode } = useFocusContext();
  const { data } = useWorkbenchData();
  const { graphEdges, graphNodes } = data;
  const [hideWeak, setHideWeak] = useState(true);
  const [afterIntervention, setAfterIntervention] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [coords, setCoords] = useState<Record<string, EdgeCoord>>({});
  const [dimensions, setDimensions] = useState({ width: 1000, height: 370 });

  const visibleEdges = useMemo(
    () => graphEdges.filter((edge) => !hideWeak || edge.strength >= 0.2),
    [graphEdges, hideWeak],
  );
  const nodeById = (id: string) => graphNodes.find((node) => node.id === id)!;

  const updateCoords = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    setDimensions({ width: containerRect.width, height: containerRect.height });

    const newCoords: Record<string, EdgeCoord> = {};

    visibleEdges.forEach((edge) => {
      const fromEl = nodeRefs.current.get(edge.from);
      const toEl = nodeRefs.current.get(edge.to);

      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Calculate exact anchor points relative to graph-canvas container
        const x1 = fromRect.right - containerRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;

        const x2 = toRect.left - containerRect.left;
        const y2 = toRect.top + toRect.height / 2 - containerRect.top;

        newCoords[edge.id] = { x1, y1, x2, y2 };
      }
    });

    setCoords(newCoords);
  };

  useLayoutEffect(() => {
    updateCoords();
    const ro = new ResizeObserver(() => updateCoords());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateCoords);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateCoords);
    };
  }, [visibleEdges, graphNodes]);

  return (
    <section className="module-panel graph-panel">
      <header className="module-header compact-header">
        <div>
          <h2>Root cause graph</h2>
          <span>Influence, evidence type, and confidence</span>
        </div>
        <div className="graph-controls">
          <button className={`toggle-button${hideWeak ? ' active' : ''}`} onClick={() => setHideWeak((value) => !value)}><i /> Hide weak</button>
          <button className={`toggle-button${afterIntervention ? ' active' : ''}`} onClick={() => setAfterIntervention((value) => !value)}><i /> Post-intervention</button>
        </div>
      </header>

      <div ref={containerRef} className={`graph-canvas${afterIntervention ? ' intervention' : ''}`}>
        <svg viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} aria-hidden="true">
          <defs>
            <marker id="arrow-observed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#889da5" />
            </marker>
            <marker id="arrow-estimated" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--amber)" />
            </marker>
            <marker id="arrow-simulated" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--teal)" />
            </marker>
          </defs>
          {visibleEdges.map((edge) => {
            const faded = afterIntervention && edge.from === 'node_queue_delay';
            const c = coords[edge.id];

            let pathData = '';
            if (c) {
              const dx = Math.max(25, Math.abs(c.x2 - c.x1) * 0.45);
              pathData = `M ${c.x1} ${c.y1} C ${c.x1 + dx} ${c.y1}, ${c.x2 - dx} ${c.y2}, ${c.x2} ${c.y2}`;
            }

            let markerUrl = 'url(#arrow-observed)';
            if (edge.evidenceType === 'model_estimated') markerUrl = 'url(#arrow-estimated)';
            if (edge.evidenceType === 'counterfactual_simulated') markerUrl = 'url(#arrow-simulated)';

            return (
              <path
                key={edge.id}
                d={pathData}
                className={`${edge.evidenceType}${faded ? ' faded' : ''}`}
                strokeWidth={Math.max(1.5, edge.strength * 2.5)}
                markerEnd={markerUrl}
              />
            );
          })}
        </svg>
        {graphNodes.map((node) => {
          const active = focus.graphNodeIds.includes(node.id);
          const aiActive = active && focus.origin === 'assistant';
          const reduced = afterIntervention && node.id === 'node_queue_delay';
          return (
            <button
              key={node.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(node.id, el);
                else nodeRefs.current.delete(node.id);
              }}
              className={`cause-node type-${node.type}${active ? ' active' : ''}${aiActive ? ' ai-active' : ''}${reduced ? ' reduced' : ''}`}
              style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
              onClick={() => focusGraphNode(node.id)}
              aria-pressed={active}
            >
              <span className="cause-node-top"><i /> {node.controllable ? 'Controllable' : node.source}</span>
              <strong>{node.label}</strong>
              <em>{reduced ? '< 60 min' : node.value}</em>
              <small>{Math.round((reduced ? 0.16 : node.influence) * 100)}% influence · {Math.round(node.confidence * 100)}% conf.</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
