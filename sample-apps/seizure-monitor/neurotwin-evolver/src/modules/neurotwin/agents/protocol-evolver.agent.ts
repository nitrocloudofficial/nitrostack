import { Injectable } from '@nitrostack/core';

export type SwarmTopology = 'leader-follower' | 'mesh' | 'cellular';

export interface CommsHealthReading {
  unitId: string;
  signalStrength: number; // 0-1
  latencyMs: number;
  packetLossPct: number; // 0-1
}

export interface TopologyDecision {
  previousTopology: SwarmTopology;
  newTopology: SwarmTopology;
  reason: string;
  affectedUnits: string[];
  timestamp: string;
}

@Injectable()
export class ProtocolEvolverAgent {
  private currentTopology: SwarmTopology = 'leader-follower';
  private topologyHistory: TopologyDecision[] = [];

  /**
   * Evaluates comms health across the swarm and decides whether
   * to switch topology. Does not touch unit logic — only comms structure.
   */
  evaluateSwarmHealth(readings: CommsHealthReading[]): TopologyDecision | null {
    const degradedUnits = readings.filter(
      (r) => r.signalStrength < 0.4 || r.packetLossPct > 0.2 || r.latencyMs > 300,
    );

    if (degradedUnits.length === 0) {
      return null; // swarm healthy, no topology change needed
    }

    const degradedRatio = degradedUnits.length / readings.length;
    let newTopology: SwarmTopology = this.currentTopology;
    let reason = '';

    if (degradedRatio > 0.5) {
      // majority of swarm struggling — go fully decentralized
      newTopology = 'cellular';
      reason = `${degradedUnits.length}/${readings.length} units degraded — switching to cellular for resilience`;
    } else if (degradedRatio > 0.2) {
      // partial degradation — mesh lets healthy units relay for weak ones
      newTopology = 'mesh';
      reason = `${degradedUnits.length}/${readings.length} units degraded — switching to mesh to relay around weak nodes`;
    } else {
      // minor issue, leader-follower still fine
      return null;
    }

    if (newTopology === this.currentTopology) {
      return null; // already in the right topology
    }

    const decision: TopologyDecision = {
      previousTopology: this.currentTopology,
      newTopology,
      reason,
      affectedUnits: degradedUnits.map((u) => u.unitId),
      timestamp: new Date().toISOString(),
    };

    this.currentTopology = newTopology;
    this.topologyHistory.push(decision);

    return decision;
  }

  getCurrentTopology(): SwarmTopology {
    return this.currentTopology;
  }

  getTopologyHistory(): TopologyDecision[] {
    return this.topologyHistory;
  }
}
