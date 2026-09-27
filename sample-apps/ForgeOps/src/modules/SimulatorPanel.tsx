import { useState } from 'react';
import { runScenario } from '../integrations/forgeOpsClient';
import { useWorkbenchData } from '../WorkbenchDataContext';
import type { LoadState, SimulationResult } from '../types';

type ScenarioKey = 'reduce_queue_delay' | 'humidity_control' | 'replace_machine_7';

const presets: Array<{ key: ScenarioKey; label: string; description: string }> = [
  { key: 'reduce_queue_delay', label: 'Reduce queue delay', description: '< 60 min · low cost' },
  { key: 'humidity_control', label: 'Humidity control', description: '< 55% RH · high cost' },
  { key: 'replace_machine_7', label: 'Replace Machine 7', description: '2–3 days downtime' },
];

const presetInputs: Record<ScenarioKey, {
  queueDelay: number;
  humidity: number;
  temperature: number;
}> = {
  reduce_queue_delay: { queueDelay: 45, humidity: 68.5, temperature: 24 },
  humidity_control: { queueDelay: 198, humidity: 50, temperature: 31.5 },
  replace_machine_7: { queueDelay: 198, humidity: 68.5, temperature: 31.5 },
};

export function SimulatorPanel() {
  const { data } = useWorkbenchData();
  const [selected, setSelected] = useState<ScenarioKey>('reduce_queue_delay');
  const [queueDelay, setQueueDelay] = useState(45);
  const [humidity, setHumidity] = useState(68.5);
  const [temperature, setTemperature] = useState(24);
  const [supplierFreeze, setSupplierFreeze] = useState(true);
  const [constraint, setConstraint] = useState('We cannot change suppliers for another month.');
  const [status, setStatus] = useState<LoadState>('idle');
  const [result, setResult] = useState<SimulationResult | null>(null);

  const run = async () => {
    setStatus('loading');
    try {
      const response = await runScenario(selected, {
        queue_delay_minutes: queueDelay,
        humidity_pct: humidity,
        temperature_c: temperature,
        replace_machine_7: selected === 'replace_machine_7',
      }, {
        no_supplier_change: supplierFreeze,
        constraint_text: constraint.trim(),
      });
      const outOfRange = queueDelay > 240 || humidity > 75 || temperature > 32;
      setResult(outOfRange ? {
        ...response,
        inValidatedRange: false,
        confidence: Math.min(response.confidence, 0.55),
        warnings: Array.from(new Set([
          ...response.warnings,
          'One or more requested values are outside the validated operating range; treat this estimate as directional only.',
        ])),
      } : response);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const preview = result ?? data.simulations[selected] ?? data.simulations.baseline;

  return (
    <section id="scenario-comparison" className="module-panel simulator-panel">
      <header className="module-header">
        <div>
          <h2>What-if simulator</h2>
          <span>Test interventions against the 82% incident baseline</span>
        </div>
      </header>

      <div className="simulator-layout">
        <div className="scenario-builder">
          <div className="scenario-presets" role="radiogroup" aria-label="Scenario preset">
            {presets.map((preset) => (
              <button
                key={preset.key}
                className={selected === preset.key ? 'active' : ''}
                onClick={() => {
                  const next = presetInputs[preset.key];
                  setSelected(preset.key);
                  setQueueDelay(next.queueDelay);
                  setHumidity(next.humidity);
                  setTemperature(next.temperature);
                  setResult(null);
                  setStatus('idle');
                }}
                role="radio"
                aria-checked={selected === preset.key}
              >
                <i />
                <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
              </button>
            ))}
          </div>

          <div className="parameter-grid">
            <label className={selected === 'reduce_queue_delay' ? 'emphasized' : ''}>
              <span><strong>Queue delay</strong><output>{queueDelay} min</output></span>
              <input type="range" min="0" max="240" value={queueDelay} onChange={(event) => setQueueDelay(Number(event.target.value))} />
              <small>Validated 0–240 · target below 60</small>
            </label>
            <label className={selected === 'humidity_control' ? 'emphasized' : ''}>
              <span><strong>Humidity</strong><output>{humidity}% RH</output></span>
              <input type="range" min="30" max="85" step="0.5" value={humidity} onChange={(event) => setHumidity(Number(event.target.value))} />
              <small>Validated 30–75 · nominal 45</small>
            </label>
            <label>
              <span><strong>Temperature</strong><output>{temperature}°C</output></span>
              <input type="range" min="18" max="35" step="0.5" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} />
              <small>Validated 18–32 · nominal 22</small>
            </label>
          </div>

          <label className="constraint-field">
            <span>Operational constraint</span>
            <textarea value={constraint} onChange={(event) => setConstraint(event.target.value)} rows={2} />
            <small>Natural-language constraints route through the integrated tool API.</small>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={supplierFreeze} onChange={(event) => setSupplierFreeze(event.target.checked)} />
            <span><strong>Supplier change freeze</strong><small>Hard constraint · 30 days remaining</small></span>
          </label>
          <button className="primary-button run-scenario-button" onClick={run} disabled={status === 'loading'}>
            {status === 'loading' ? <><i className="spinner" /> Running simulation…</> : <>Run scenario <span>→</span></>}
          </button>
        </div>

        <div className="simulation-output" aria-live="polite">
          <div className="simulation-output-head">
            <div>
              <span>Predicted outcome</span>
              <h3>{preview.scenarioName}</h3>
            </div>
            <span className={preview.inValidatedRange ? 'range-valid' : 'range-warning'}>
              {preview.inValidatedRange ? 'Within validated range' : 'Outside validated range'}
            </span>
          </div>

          <div className="yield-comparison">
            <div className="yield-column baseline">
              <span>Incident</span>
              <div><i style={{ height: `${preview.baselineYield}%` }} /></div>
              <strong>{preview.baselineYield}%</strong>
            </div>
            <div className="yield-arrow">→<small>{preview.predictedYield >= preview.baselineYield ? '+' : ''}{(preview.predictedYield - preview.baselineYield).toFixed(1)} pts</small></div>
            <div className="yield-column predicted">
              <span>Predicted</span>
              <div><i style={{ height: `${preview.predictedYield}%` }} /></div>
              <strong>{preview.predictedYield}%</strong>
            </div>
          </div>

          <div className="output-metrics">
            <span><small>Confidence</small><strong>{Math.round(preview.confidence * 100)}%</strong></span>
            <span><small>Cost</small><strong>{preview.cost}</strong></span>
            <span><small>Effort</small><strong>{preview.effort}</strong></span>
          </div>

          {preview.reasoning && (
            <div className="simulation-reasoning">
              <strong>Why?</strong>
              <p>{preview.reasoning}</p>
            </div>
          )}
          {preview.warnings.length > 0 && (
            <div className="simulation-warning">
              <strong>Guardrail</strong>
              {preview.warnings.slice(0, 2).map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}
          <div className="assumptions">
            <strong>Assumptions</strong>
            <ul>{preview.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
          </div>
          {status === 'idle' && <p className="output-footnote">Preview uses the deterministic handoff fixture. Run to validate your current inputs.</p>}
          {status === 'success' && <p className="output-footnote success">Scenario complete · {preview.scenarioId}</p>}
          {status === 'error' && <p className="output-footnote error">Simulation failed. The previous validated result remains visible.</p>}
        </div>
      </div>
    </section>
  );
}
