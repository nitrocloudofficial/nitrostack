import { Injectable } from '@nitrostack/core';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const machinesData = require('../../../fixtures/machines.json');

export interface MachineReading {
  hour: number;
  temperature: number;
  vibration: number;
  pressure: number;
  motorCurrent: number;
  rpm: number;
  energyConsumption: number;
}

interface Machine {
  id: string;
  name: string;
  history: MachineReading[];
}

@Injectable()
export class DiagnosticsService {
  private machines: Map<string, Machine> = new Map();

  constructor() {
    // Load machines from fixture
    (machinesData.machines as Machine[]).forEach(machine => {
      this.machines.set(machine.id, machine);
    });
  }

  getMachine(machineId: string): Machine | null {
    return this.machines.get(machineId) || null;
  }

  // ⚡ True Random Live Telemetry Engine
  private applyLiveJitter(reading: MachineReading): MachineReading {
    const tempRandom = (Math.random() * 1.6 - 0.8);       // ±0.8°C random shift
    const vibRandom = (Math.random() * 0.24 - 0.12);      // ±0.12 mm/s random shift
    const rpmRandom = Math.floor(Math.random() * 18 - 9);  // ±9 RPM random shift
    const currRandom = (Math.random() * 0.4 - 0.2);       // ±0.20 A random shift
    const pressRandom = (Math.random() * 0.1 - 0.05);     // ±0.05 bar random shift

    return {
      ...reading,
      temperature: +(Math.max(40, reading.temperature + tempRandom)).toFixed(1),
      vibration: +(Math.max(0.5, reading.vibration + vibRandom)).toFixed(2),
      pressure: +(Math.max(1.0, reading.pressure + pressRandom)).toFixed(1),
      rpm: Math.max(1000, reading.rpm + rpmRandom),
      motorCurrent: +(Math.max(5, reading.motorCurrent + currRandom)).toFixed(2)
    };
  }

  getMachineStatus(machineId: string): MachineReading | null {
    const machine = this.getMachine(machineId);
    if (!machine || machine.history.length === 0) return null;
    const latest = machine.history[machine.history.length - 1];
    return this.applyLiveJitter(latest);
  }

  getMachineHistory(machineId: string, hours: number = 24): MachineReading[] {
    const machine = this.getMachine(machineId);
    if (!machine) return [];
    const start = Math.max(0, machine.history.length - hours);
    const history = machine.history.slice(start);

    if (history.length > 0) {
      history[history.length - 1] = this.applyLiveJitter(history[history.length - 1]);
    }
    return history;
  }

  computeHealthScore(machineId: string): {
    score: number;
    scoreHistory: number[];
    details: {
      temperatureScore: number;
      vibrationScore: number;
      pressureScore: number;
      currentScore: number;
      rpmScore: number;
    };
  } {
    const history = this.getMachineHistory(machineId, 24);
    if (history.length === 0) {
      return {
        score: 0,
        scoreHistory: [],
        details: {
          temperatureScore: 0,
          vibrationScore: 0,
          pressureScore: 0,
          currentScore: 0,
          rpmScore: 0
        }
      };
    }

    const scoreHistory = history.map(reading => {
      return this.calculateReadingScore(reading);
    });

    const score = scoreHistory[scoreHistory.length - 1];
    const current = history[history.length - 1];
    const details = {
      temperatureScore: this.scoreTemperature(current.temperature),
      vibrationScore: this.scoreVibration(current.vibration),
      pressureScore: this.scorePressure(current.pressure),
      currentScore: this.scoreCurrent(current.motorCurrent),
      rpmScore: this.scoreRpm(current.rpm)
    };

    return {
      score: Math.round(score),
      scoreHistory: scoreHistory.map(s => Math.round(s)),
      details
    };
  }

  private calculateReadingScore(reading: MachineReading): number {
    const tempScore = this.scoreTemperature(reading.temperature);
    const vibScore = this.scoreVibration(reading.vibration);
    const pressScore = this.scorePressure(reading.pressure);
    const currScore = this.scoreCurrent(reading.motorCurrent);
    const rpmScore = this.scoreRpm(reading.rpm);

    return (
      tempScore * 0.25 +
      vibScore * 0.35 +
      pressScore * 0.15 +
      currScore * 0.15 +
      rpmScore * 0.10
    );
  }

  private scoreTemperature(temp: number): number {
    if (temp < 60) return 85;
    if (temp <= 65) return 100;
    if (temp <= 75) return 95;
    if (temp <= 85) return 70;
    if (temp <= 95) return 40;
    return 10;
  }

  private scoreVibration(vib: number): number {
    if (vib < 1.5) return 100;
    if (vib <= 2.0) return 95;
    if (vib <= 3.0) return 80;
    if (vib <= 4.0) return 50;
    if (vib <= 5.0) return 25;
    return 5;
  }

  private scorePressure(pressure: number): number {
    if (pressure < 5.5) return 40;
    if (pressure < 6.0) return 70;
    if (pressure <= 6.5) return 100;
    if (pressure <= 7.0) return 85;
    return 50;
  }

  private scoreCurrent(current: number): number {
    if (current < 11) return 70;
    if (current <= 13) return 100;
    if (current <= 14) return 90;
    if (current <= 15) return 70;
    if (current <= 16) return 40;
    return 10;
  }

  private scoreRpm(rpm: number): number {
    if (rpm >= 1490) return 100;
    if (rpm >= 1450) return 90;
    if (rpm >= 1400) return 70;
    if (rpm >= 1350) return 40;
    return 10;
  }

  predictFailure(machineId: string): {
    riskLevel: 'Healthy' | 'Warning' | 'Critical';
    estimatedRemainingUsefulLifeHours: number;
    confidence: number;
    explainability: string[];
  } {
    const history = this.getMachineHistory(machineId, 24);
    if (history.length < 2) {
      return {
        riskLevel: 'Healthy',
        estimatedRemainingUsefulLifeHours: 168,
        confidence: 50,
        explainability: ['Insufficient data for prediction']
      };
    }

    const current = history[history.length - 1];
    const previous = history[0];
    const explainability: string[] = [];

    const tempChange = ((current.temperature - previous.temperature) / previous.temperature) * 100;
    const vibChange = ((current.vibration - previous.vibration) / previous.vibration) * 100;
    const rpmChange = ((current.rpm - previous.rpm) / previous.rpm) * 100;
    const currentChange = ((current.motorCurrent - previous.motorCurrent) / previous.motorCurrent) * 100;

    let riskScore = 0;
    let confidence = 70;

    if (tempChange > 15) {
      riskScore += 30;
      explainability.push(`Temperature increased ${tempChange.toFixed(1)}% over 24h`);
    } else if (tempChange > 5) {
      riskScore += 15;
      explainability.push(`Temperature increased ${tempChange.toFixed(1)}% over 24h`);
    }

    if (current.vibration > 5.0) {
      riskScore += 40;
      explainability.push(`Vibration exceeded safe threshold of 5mm/s (current: ${current.vibration.toFixed(2)}mm/s)`);
      confidence = 95;
    } else if (vibChange > 50) {
      riskScore += 35;
      explainability.push(`Vibration increased ${vibChange.toFixed(1)}% over 24h`);
      confidence = 90;
    } else if (vibChange > 20) {
      riskScore += 15;
      explainability.push(`Vibration increased ${vibChange.toFixed(1)}% over 24h`);
    }

    if (rpmChange < -5) {
      riskScore += 20;
      explainability.push(`RPM dropped ${Math.abs(rpmChange).toFixed(1)}%`);
    }

    if (currentChange > 15) {
      riskScore += 20;
      explainability.push(`Motor current increased ${currentChange.toFixed(1)}%`);
    }

    if (current.pressure < 6.0) {
      riskScore += 15;
      explainability.push(`Pressure dropped below 6.0 bar (current: ${current.pressure.toFixed(2)}bar)`);
    }

    let riskLevel: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
    let rul = 168;

    if (riskScore >= 70) {
      riskLevel = 'Critical';
      rul = Math.max(2, 24 - Math.floor(riskScore / 10));
      confidence = Math.min(99, confidence + 20);
    } else if (riskScore >= 40) {
      riskLevel = 'Warning';
      rul = Math.max(12, 72 - Math.floor(riskScore / 5));
      confidence = Math.min(95, confidence + 10);
    } else {
      riskLevel = 'Healthy';
      rul = 168;
    }

    if (explainability.length === 0) {
      explainability.push('All parameters within normal operating range');
    }

    return {
      riskLevel,
      estimatedRemainingUsefulLifeHours: rul,
      confidence,
      explainability
    };
  }

  rootCauseAnalysis(machineId: string): {
    primaryCause: string;
    confidence: number;
    alternativeCauses: string[];
    supportingEvidence: string[];
  } {
    const history = this.getMachineHistory(machineId, 24);
    if (history.length < 2) {
      return {
        primaryCause: 'Insufficient data',
        confidence: 0,
        alternativeCauses: [],
        supportingEvidence: []
      };
    }

    const current = history[history.length - 1];
    const previous = history[0];
    const evidence: string[] = [];

    const tempUp = current.temperature > previous.temperature + 5;
    const vibUp = current.vibration > previous.vibration + 1.0;
    const rpmDown = current.rpm < previous.rpm - 50;
    const currentUp = current.motorCurrent > previous.motorCurrent + 1.0;
    const pressureDown = current.pressure < previous.pressure - 0.3;

    let primaryCause = 'Unknown';
    let confidence = 50;
    const alternativeCauses: string[] = [];

    if (tempUp && vibUp && rpmDown && currentUp) {
      primaryCause = 'Bearing wear or lubrication failure';
      confidence = 92;
      evidence.push(`Temperature increased from ${previous.temperature.toFixed(1)}°C to ${current.temperature.toFixed(1)}°C`);
      evidence.push(`Vibration increased from ${previous.vibration.toFixed(2)}mm/s to ${current.vibration.toFixed(2)}mm/s`);
      evidence.push(`RPM decreased from ${previous.rpm} to ${current.rpm}`);
      evidence.push(`Motor current increased from ${previous.motorCurrent.toFixed(1)}A to ${current.motorCurrent.toFixed(1)}A`);
      alternativeCauses.push('Misalignment');
      alternativeCauses.push('Worn gears');
    }
    else if (tempUp && vibUp && pressureDown) {
      primaryCause = 'Lubrication system failure or low oil level';
      confidence = 85;
      evidence.push(`Temperature increased from ${previous.temperature.toFixed(1)}°C to ${current.temperature.toFixed(1)}°C`);
      evidence.push(`Vibration increased from ${previous.vibration.toFixed(2)}mm/s to ${current.vibration.toFixed(2)}mm/s`);
      evidence.push(`Pressure decreased from ${previous.pressure.toFixed(2)}bar to ${current.pressure.toFixed(2)}bar`);
      alternativeCauses.push('Bearing wear');
      alternativeCauses.push('Pump failure');
    }
    else if (pressureDown && currentUp) {
      primaryCause = 'System blockage or flow restriction';
      confidence = 78;
      evidence.push(`Pressure decreased from ${previous.pressure.toFixed(2)}bar to ${current.pressure.toFixed(2)}bar`);
      evidence.push(`Motor current increased from ${previous.motorCurrent.toFixed(1)}A to ${current.motorCurrent.toFixed(1)}A`);
      alternativeCauses.push('Filter clogging');
      alternativeCauses.push('Valve malfunction');
    }
    else if (currentUp && rpmDown) {
      primaryCause = 'Mechanical overload or increased friction';
      confidence = 80;
      evidence.push(`Motor current increased from ${previous.motorCurrent.toFixed(1)}A to ${current.motorCurrent.toFixed(1)}A`);
      evidence.push(`RPM decreased from ${previous.rpm} to ${current.rpm}`);
      alternativeCauses.push('Bearing wear');
      alternativeCauses.push('Misalignment');
    }
    else if (tempUp && !vibUp) {
      primaryCause = 'Thermal management issue or ambient temperature increase';
      confidence = 65;
      evidence.push(`Temperature increased from ${previous.temperature.toFixed(1)}°C to ${current.temperature.toFixed(1)}°C`);
      alternativeCauses.push('Cooling system failure');
      alternativeCauses.push('Increased workload');
    }
    else if (vibUp && !tempUp) {
      primaryCause = 'Mechanical imbalance or looseness';
      confidence = 70;
      evidence.push(`Vibration increased from ${previous.vibration.toFixed(2)}mm/s to ${current.vibration.toFixed(2)}mm/s`);
      alternativeCauses.push('Bearing wear');
      alternativeCauses.push('Misalignment');
    }
    else {
      primaryCause = 'Requires manual inspection';
      confidence = 40;
      evidence.push('No clear degradation pattern detected');
      alternativeCauses.push('Sensor calibration issue');
      alternativeCauses.push('Intermittent fault');
    }

    return {
      primaryCause,
      confidence,
      alternativeCauses,
      supportingEvidence: evidence
    };
  }
}