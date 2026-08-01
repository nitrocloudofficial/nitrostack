export interface ScaleContext {
  currentReplicas: number;
  targetReplicas: number;
  minReplicasPolicy: number;
  pdbDesiredHealthy: number;
  pdbDisruptionsAllowed: number;
}
export interface Decision { allowed: boolean; reason: string; }

export function evaluateScale(ctx: ScaleContext): Decision {
  if (ctx.targetReplicas >= ctx.currentReplicas) {
    return { allowed: true, reason: 'Scale up or no-op — always safe.' };
  }
  const floor = Math.max(ctx.minReplicasPolicy, ctx.pdbDesiredHealthy);
  if (ctx.targetReplicas < floor) {
    return { allowed: false,
      reason: `VETO: target ${ctx.targetReplicas} < required floor ${floor} ` +
              `(policy min ${ctx.minReplicasPolicy}, PDB desiredHealthy ${ctx.pdbDesiredHealthy}).` };
  }
  const podsRemoved = ctx.currentReplicas - ctx.targetReplicas;
  if (podsRemoved > ctx.pdbDisruptionsAllowed) {
    return { allowed: false,
      reason: `VETO: removing ${podsRemoved} pods exceeds PDB disruptionsAllowed ` +
              `${ctx.pdbDisruptionsAllowed} right now — would breach the budget.` };
  }
  return { allowed: true, reason: `Safe: stays at/above floor ${floor}, within disruption budget.` };
}
