import { useCallback, useState } from 'react';
import { FocusProvider } from './FocusContext';
import { WorkbenchDataProvider, useWorkbenchData } from './WorkbenchDataContext';
import { LaunchIntro } from './LaunchIntro';
import { HomeDashboard } from './modules/HomeDashboard';
import { Workbench } from './modules/Workbench';

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function App() {
  const [view, setView] = useState<'dashboard' | 'workbench'>('dashboard');
  const [showIntro, setShowIntro] = useState(true);
  const completeIntro = useCallback(() => setShowIntro(false), []);

  return (
    <WorkbenchDataProvider>
      <FocusProvider>
      <div className="app-shell">
        {showIntro && <LaunchIntro onComplete={completeIntro} />}
        <header className="app-header">
          <button className="brand-button" onClick={() => setView('dashboard')} aria-label="Go to ForgeOps dashboard">
            <BrandMark />
            <span>
              <strong>FORGE<span>OPS</span></strong>
              <small>Decision intelligence</small>
            </span>
          </button>
          <div className="header-context">
            <LiveDataLabel />
            <span className="header-divider" />
            <span className="shift-label">Incident INC-2407-001</span>
            <span className="avatar-button" aria-label="Signed in as Vaishak">VK</span>
          </div>
        </header>

        {view === 'dashboard'
          ? <HomeDashboard onOpen={() => setView('workbench')} />
          : <Workbench onBack={() => setView('dashboard')} />}
      </div>
      </FocusProvider>
    </WorkbenchDataProvider>
  );
}

function LiveDataLabel() {
  const { data, loading } = useWorkbenchData();
  return (
    <span className="live-indicator">
      <i /> {data.incident.plant} · {loading
        ? 'Connecting to MCP'
        : data.live
          ? 'Live NitroCloud MCP'
          : 'Fallback dataset'}
    </span>
  );
}

export default App;
