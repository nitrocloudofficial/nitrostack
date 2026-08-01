import { getState, updateDeployment, removeDeployment } from '../../state/state.js';

const TRAFFIC_STEPS = [10, 25, 50, 75, 100];
const STEP_INTERVAL = 8000; // 8 seconds per step
const activeTimers = new Map<string, NodeJS.Timeout>();

function simulateMetrics() {
  const spike = Math.random() < 0.10;
  return {
    error_rate: spike ? 2.5 + Math.random() * 3 : Math.random() * 1.0,
    latency_p99: spike ? 850 + Math.random() * 300 : 150 + Math.random() * 350
  };
}

export function startCanary(deploymentId: string) {
  let stepIndex = 0;

  const tick = () => {
    const state = getState();
    const dep = state.devops.deployments.find(d => d.id === deploymentId);
    if (!dep || dep.status !== 'active') {
      activeTimers.delete(deploymentId);
      return;
    }

    const metrics = simulateMetrics();
    const shouldRollback = metrics.error_rate > 2.0 || metrics.latency_p99 > 800;

    if (shouldRollback) {
      updateDeployment(deploymentId, { status: 'rolled_back', traffic_pct: 0, metrics });
      activeTimers.delete(deploymentId);
      setTimeout(() => removeDeployment(deploymentId), 12000);
      return;
    }

    const newTrafficPct = TRAFFIC_STEPS[stepIndex] ?? 100;
    stepIndex++;
    const isComplete = stepIndex >= TRAFFIC_STEPS.length;

    updateDeployment(deploymentId, {
      traffic_pct: newTrafficPct,
      metrics,
      phase: `Step ${stepIndex}/${TRAFFIC_STEPS.length}`,
      status: isComplete ? 'complete' : 'active'
    });

    if (isComplete) {
      activeTimers.delete(deploymentId);
      setTimeout(() => removeDeployment(deploymentId), 15000);
    } else {
      const timerId = setTimeout(tick, STEP_INTERVAL);
      activeTimers.set(deploymentId, timerId);
    }
  };

  const timerId = setTimeout(tick, STEP_INTERVAL);
  activeTimers.set(deploymentId, timerId);
}

export function stopCanary(deploymentId: string) {
  if (activeTimers.has(deploymentId)) {
    clearTimeout(activeTimers.get(deploymentId));
    activeTimers.delete(deploymentId);
  }
}
