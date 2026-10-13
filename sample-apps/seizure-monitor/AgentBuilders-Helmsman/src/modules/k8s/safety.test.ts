import assert from 'node:assert';
import { evaluateScale } from './safety.js';

const base = { minReplicasPolicy: 3, pdbDesiredHealthy: 3, pdbDisruptionsAllowed: 2 };

// Scale to 1 breaches the floor -> veto.
assert.strictEqual(evaluateScale({ ...base, currentReplicas: 5, targetReplicas: 1 }).allowed, false);
// Scale to 3 hits the floor exactly -> allowed.
assert.strictEqual(evaluateScale({ ...base, currentReplicas: 5, targetReplicas: 3 }).allowed, true);
// Removing 4 pods at once when only 2 disruptions allowed -> veto (burst rule).
assert.strictEqual(
  evaluateScale({ minReplicasPolicy: 0, pdbDesiredHealthy: 2, pdbDisruptionsAllowed: 2,
                  currentReplicas: 6, targetReplicas: 2 }).allowed, false);
// Scale up always fine.
assert.strictEqual(evaluateScale({ ...base, currentReplicas: 3, targetReplicas: 5 }).allowed, true);

console.log('safety self-check: OK');
