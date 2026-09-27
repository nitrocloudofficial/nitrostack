import { useEffect, useState } from 'react';

type LaunchIntroProps = {
  onComplete: () => void;
};

export function LaunchIntro({ onComplete }: LaunchIntroProps) {
  const [exiting, setExiting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setReady(true), 2920);
    const exitTimer = window.setTimeout(() => setExiting(true), 5200);
    const completeTimer = window.setTimeout(onComplete, 5670);

    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const skip = () => {
    setExiting(true);
    window.setTimeout(onComplete, 360);
  };

  return (
    <div className={`launch-intro${exiting ? ' is-exiting' : ''}`} role="dialog" aria-label="ForgeOps is starting">
      <div className="launch-grid" aria-hidden="true" />

      <header className="launch-header">
        <span>FORGEOPS / CONTROL SYSTEM</span>
        <span className={`launch-header-status${ready ? ' is-ready' : ''}`}>
          <i /> {ready ? 'SYSTEM READY' : 'INITIALIZING'}
        </span>
      </header>

      <main className="launch-stage">
        <div className="assembly-rig" aria-hidden="true">
          <div className="assembly-axis horizontal" />
          <div className="assembly-axis vertical" />

          <div className="assembly-arm assembly-arm-left">
            <span className="arm-joint" />
            <span className="arm-head"><i /><i /></span>
          </div>
          <div className="assembly-arm assembly-arm-right">
            <span className="arm-head"><i /><i /></span>
            <span className="arm-joint" />
          </div>

          <div className="assembly-gear gear-left">
            <span /><span /><span /><span /><span /><span /><span /><span />
            <i />
          </div>
          <div className="assembly-gear gear-right">
            <span /><span /><span /><span /><span /><span /><span /><span />
            <i />
          </div>

          <div className="assembly-core">
            <span className="core-corner corner-one" />
            <span className="core-corner corner-two" />
            <span className="core-corner corner-three" />
            <span className="core-corner corner-four" />
            <div className="core-mark">
              <i /><i /><i />
            </div>
          </div>

          <div className="assembly-pulse pulse-one" />
          <div className="assembly-pulse pulse-two" />
        </div>

        <div className="launch-copy">
          <p>Decision intelligence for manufacturing</p>
          <h1>FORGE<span>OPS</span></h1>
          <div className="launch-rule"><i /></div>
          <strong>Operations aligned. Intelligence online.</strong>
        </div>
      </main>

      <footer className="launch-footer">
        <div className="launch-checks" aria-label="Startup progress">
          <span><i /> MCP DATA LINK</span>
          <span><i /> 4 AGENT ROLES</span>
          <span><i /> DECISION CORE</span>
        </div>
        <button type="button" onClick={skip}>Skip intro <span>→</span></button>
      </footer>
    </div>
  );
}
