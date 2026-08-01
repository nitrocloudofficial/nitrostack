type JsonRecord = Record<string, unknown>;
type PlanChoice = 'balanced_decompression' | 'fast_capacity_release' | 'transfer_first';
import {
  surgeRepository,
  type StoredBed,
  type StoredPolicy,
  type StoredQueueEntry,
  type StoredStaff,
} from './surgeguard.repository.js';

export type SurgeEvent =
  | 'arrival_spike'
  | 'staff_callout'
  | 'beds_cleaned'
  | 'discharge_wave';

export interface CustomSurgeScenario {
  arrivals: number;
  queueCompletions?: number;
  rnChange: number;
  bedsCleaned: number;
  discharges: number;
}

interface PlanEligibility {
  status: 'clear' | 'conditional' | 'blocked';
  reason: string;
  remediation: string;
}

type BedRecord = StoredBed;
type QueueRecord = StoredQueueEntry;
type StaffRecord = StoredStaff;
type PolicyRecord = StoredPolicy;

const PLAN_IDS = {
  balanced_decompression: '98c9b7f2-a9ce-49a9-97d2-b39e181c51d3',
  fast_capacity_release: '549f6a4a-d7b7-4ea6-9af7-7f0c046b5dc7',
  transfer_first: '1ec26f84-6642-4bb2-aa45-afc05bf2decb',
};

const EXECUTION_ID = '1a04431a-e9d8-4961-b5fa-e370ab5de74c';
const PLAN_HASH = 'sha256:82f7d97091d42b9386fb8a4406ef10fe';

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampInteger(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentileValue))];
}

function timestamp(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

class SurgeSimulation {
  private readonly random: () => number;
  private readonly beds: BedRecord[] = [];
  private readonly queues: QueueRecord[] = [];
  private readonly staff: StaffRecord[] = [];
  private readonly policies: PolicyRecord[] = [];
  private tick = 0;
  private lastLiveAdvanceAt = Date.now();
  private livePauseUntil = 0;
  private readonly planningSnapshots = new Map<string, JsonRecord>();
  private lastEvent: SurgeEvent | 'custom_scenario' | 'baseline' = 'baseline';
  private approvedPlan: PlanChoice | null = null;
  private executionStatus: 'not_started' | 'running' | 'completed' | 'failed' = 'not_started';
  private executionProgress = 0;

  constructor() {
    const startupSeed = Math.floor(Date.now() / 60_000) ^ 0x5A17C0DE;
    this.random = mulberry32(startupSeed);
    if (surgeRepository.hasOperationalData()) {
      this.beds.push(...surgeRepository.loadBeds());
      this.queues.push(...surgeRepository.loadQueues());
      this.staff.push(...surgeRepository.loadStaff());
      this.policies.push(...surgeRepository.loadPolicies());
      const state = surgeRepository.loadState();
      this.tick = state.tick;
      this.lastEvent = state.lastEvent as SurgeEvent | 'custom_scenario' | 'baseline';
      this.approvedPlan = state.approvedPlan as PlanChoice | null;
      this.executionStatus = state.executionStatus as typeof this.executionStatus;
      this.executionProgress = state.executionProgress;
    } else {
      this.generateBeds();
      this.generateQueues();
      this.generateStaff();
      this.generatePolicies();
      surgeRepository.seed(this.beds, this.queues, this.staff, this.policies);
    }
  }

  get recordCount() {
    return this.beds.length + this.queues.length + this.staff.length + this.policies.length;
  }

  currentPlanId() {
    if (this.approvedPlan === 'transfer_first') return PLAN_IDS.transfer_first;
    if (this.approvedPlan === 'fast_capacity_release') return PLAN_IDS.fast_capacity_release;
    return PLAN_IDS.balanced_decompression;
  }

  advanceLiveClock(now = Date.now()) {
    if (now < this.livePauseUntil) {
      this.lastLiveAdvanceAt = now;
      return false;
    }

    const elapsedSeconds = Math.floor((now - this.lastLiveAdvanceAt) / 1_000);
    if (elapsedSeconds < 1) return false;

    const steps = Math.min(elapsedSeconds, 3);
    this.lastLiveAdvanceAt = now;
    const changedBeds = new Map<string, BedRecord>();
    const changedQueues = new Map<string, QueueRecord>();
    const changedStaff = new Map<string, StaffRecord>();
    const operationalRoles = new Set([
      'Emergency RN',
      'Critical Care RN',
      'Respiratory Therapist',
      'Hospitalist',
    ]);

    const trackBed = (bed: BedRecord) => changedBeds.set(bed.id, bed);
    const trackQueue = (entry: QueueRecord) => changedQueues.set(entry.id, entry);
    const trackStaff = (person: StaffRecord) => changedStaff.set(person.id, person);

    for (let step = 0; step < steps; step += 1) {
      this.tick += 1;
      const phase = this.tick % 30;
      const recovering = phase < 12;
      const stable = phase >= 12 && phase < 16;

      if (recovering) {
        this.queues
          .filter((entry) => entry.active)
          .slice(0, 6)
          .forEach((entry) => {
            entry.active = false;
            trackQueue(entry);
          });
        this.selectBedsAcrossUnits('cleaning', 2, 'highest_occupancy')
          .forEach((bed) => {
            bed.status = 'available';
            trackBed(bed);
          });
        this.selectBedsAcrossUnits('occupied', 1, 'highest_occupancy')
          .forEach((bed) => {
            bed.status = 'cleaning';
            trackBed(bed);
          });
        if (phase % 3 === 0) {
          this.staff
            .filter((person) =>
              operationalRoles.has(person.role) &&
              !person.onShift)
            .slice(0, 1)
            .forEach((person) => {
              person.onShift = true;
              person.eligible = true;
              person.restricted = false;
              trackStaff(person);
            });
        }
      } else if (stable) {
        const easing = phase % 2 === 0;
        const queueCandidates = this.queues.filter((entry) =>
          easing ? entry.active : !entry.active);
        queueCandidates.slice(0, 2).forEach((entry, index) => {
          entry.active = !easing;
          if (!easing) entry.enteredAt = now - (8 + index * 3) * 60_000;
          trackQueue(entry);
        });

        const bed = this.selectBedsAcrossUnits(
          easing ? 'occupied' : 'available',
          1,
          easing ? 'highest_occupancy' : 'lowest_occupancy',
        )[0];
        if (bed) {
          bed.status = easing ? 'cleaning' : 'occupied';
          trackBed(bed);
        }
        if (easing) {
          const cleaned = this.selectBedsAcrossUnits(
            'cleaning',
            1,
            'highest_occupancy',
            new Set(bed ? [bed.id] : []),
          )[0];
          if (cleaned) {
            cleaned.status = 'available';
            trackBed(cleaned);
          }
        }
      } else {
        this.queues
          .filter((entry) => !entry.active)
          .slice(0, 4)
          .forEach((entry, index) => {
            entry.active = true;
            entry.enteredAt = now - (12 + (index % 12) * 8) * 60_000;
            trackQueue(entry);
          });
        this.selectBedsAcrossUnits('cleaning', 1, 'highest_occupancy')
          .forEach((bed) => {
            bed.status = 'available';
            trackBed(bed);
          });
        this.selectBedsAcrossUnits('available', 1, 'lowest_occupancy')
          .forEach((bed) => {
            bed.status = 'occupied';
            trackBed(bed);
          });

        if (phase % 6 === 0) {
          const callout = this.staff.find((person) =>
            operationalRoles.has(person.role) &&
            person.onShift &&
            person.eligible);
          if (callout) {
            callout.onShift = false;
            callout.eligible = false;
            callout.restricted = true;
            trackStaff(callout);
          }
        }
      }
    }

    if (changedBeds.size) surgeRepository.saveBeds([...changedBeds.values()]);
    if (changedQueues.size) surgeRepository.saveQueues([...changedQueues.values()]);
    if (changedStaff.size) surgeRepository.saveStaff([...changedStaff.values()]);
    this.persistState();
    return true;
  }

  planEligibility(planId: string): PlanEligibility {
    const staffing = this.staffingData();
    const totalGap = (staffing.gaps as JsonRecord[])
      .reduce((sum, gap) => sum + Number(gap.count), 0);
    const fatigueCount = this.staff
      .filter((person) => person.fatigueRisk && person.onShift).length;
    const pressureScore = Number(
      (this.queueData().system_pressure as JsonRecord).score,
    );

    if (planId === PLAN_IDS.fast_capacity_release) {
      if (totalGap >= 4) {
        return {
          status: 'blocked',
          reason: `${totalGap} qualified positions are uncovered; fast capacity release would open beds before they can be safely staffed.`,
          remediation: 'Reduce the total qualified staffing gap below four, then re-run the policy gate.',
        };
      }
      if (fatigueCount > 0) {
        return {
          status: 'conditional',
          reason: `${fatigueCount} on-shift assignments are approaching the fatigue limit.`,
          remediation: 'Confirm float coverage and replace fatigue-risk assignments before activation.',
        };
      }
      return {
        status: 'clear',
        reason: totalGap > 0
          ? `${totalGap} remaining staffing gaps are within the plan’s three-position float coverage.`
          : 'Staffing minimums and fatigue controls support rapid capacity release.',
        remediation: 'No remediation is currently required.',
      };
    }

    if (planId === PLAN_IDS.balanced_decompression) {
      if (totalGap >= 12) {
        return {
          status: 'blocked',
          reason: `${totalGap} qualified positions are uncovered, exceeding the balanced plan’s mitigation capacity.`,
          remediation: 'Reduce the qualified staffing gap below twelve before approval.',
        };
      }
      if (totalGap > 0 || fatigueCount > 0) {
        return {
          status: 'conditional',
          reason: totalGap > 0
            ? `${totalGap} qualified staffing positions require assigned mitigation.`
            : `${fatigueCount} on-shift assignments are approaching the fatigue limit.`,
          remediation: 'Keep float coverage and fatigue replacement actions in the approved plan.',
        };
      }
      return {
        status: 'clear',
        reason: 'Current staffing and fatigue controls support balanced decompression.',
        remediation: 'No remediation is currently required.',
      };
    }

    if (pressureScore >= 95) {
      return {
        status: 'conditional',
        reason: `System pressure is ${pressureScore}/100; receiving-facility acceptance must be reconfirmed immediately before transfer.`,
        remediation: 'Confirm receiving beds and transport availability at approval time.',
      };
    }
    return {
      status: 'clear',
      reason: 'Transfer-first is supported by current pressure and staffing conditions.',
      remediation: 'No remediation is currently required.',
    };
  }

  private persistState() {
    surgeRepository.saveState({
      tick: this.tick,
      lastEvent: this.lastEvent,
      approvedPlan: this.approvedPlan,
      executionStatus: this.executionStatus,
      executionProgress: this.executionProgress,
    });
  }

  private selectBedsAcrossUnits(
    status: BedRecord['status'],
    limit: number,
    preference: 'highest_occupancy' | 'lowest_occupancy',
    excludedIds = new Set<string>(),
  ) {
    const staffedCapacity = new Map<string, number>();
    const occupied = new Map<string, number>();
    const candidates = new Map<string, BedRecord[]>();
    const selectedByUnit = new Map<string, number>();

    for (const bed of this.beds) {
      if (!bed.staffed) continue;
      staffedCapacity.set(bed.code, (staffedCapacity.get(bed.code) ?? 0) + 1);
      if (bed.status === 'occupied') {
        occupied.set(bed.code, (occupied.get(bed.code) ?? 0) + 1);
      }
      if (bed.status === status && !excludedIds.has(bed.id)) {
        const unitCandidates = candidates.get(bed.code) ?? [];
        unitCandidates.push(bed);
        candidates.set(bed.code, unitCandidates);
      }
    }

    const selected: BedRecord[] = [];
    const target = Math.max(0, Math.floor(limit));
    while (selected.length < target) {
      const availableUnits = [...candidates.entries()]
        .filter(([, beds]) => beds.length > 0);
      if (!availableUnits.length) break;

      availableUnits.sort(([leftCode], [rightCode]) => {
        const leftCapacity = staffedCapacity.get(leftCode) ?? 1;
        const rightCapacity = staffedCapacity.get(rightCode) ?? 1;
        const leftSelections = selectedByUnit.get(leftCode) ?? 0;
        const rightSelections = selectedByUnit.get(rightCode) ?? 0;
        const distributionDifference = leftSelections - rightSelections;
        if (distributionDifference) return distributionDifference;
        const leftProjected = (
          (occupied.get(leftCode) ?? 0) +
          (status === 'available' ? leftSelections : -leftSelections)
        ) / leftCapacity;
        const rightProjected = (
          (occupied.get(rightCode) ?? 0) +
          (status === 'available' ? rightSelections : -rightSelections)
        ) / rightCapacity;
        const pressureDifference = preference === 'highest_occupancy'
          ? rightProjected - leftProjected
          : leftProjected - rightProjected;
        return pressureDifference || leftCode.localeCompare(rightCode);
      });

      const [unitCode, unitBeds] = availableUnits[0];
      const nextBed = unitBeds.shift();
      if (!nextBed) break;
      selected.push(nextBed);
      selectedByUnit.set(unitCode, (selectedByUnit.get(unitCode) ?? 0) + 1);
    }

    return selected;
  }

  private selectArrivalBeds(arrivals: number) {
    const treatmentDemand = Math.ceil(Math.max(0, arrivals) * 0.65);
    const emergencyCandidates = this.beds
      .filter((bed) =>
        bed.staffed &&
        bed.code === 'ED' &&
        bed.status === 'available');
    const emergencyTarget = Math.ceil(treatmentDemand * 0.7);
    const selected = emergencyCandidates.slice(0, emergencyTarget);
    const excludedEmergencyIds = new Set(
      emergencyCandidates.map((bed) => bed.id),
    );
    selected.push(
      ...this.selectBedsAcrossUnits(
        'available',
        treatmentDemand - selected.length,
        'lowest_occupancy',
        excludedEmergencyIds,
      ),
    );
    if (selected.length < treatmentDemand) {
      selected.push(
        ...this.selectBedsAcrossUnits(
          'available',
          treatmentDemand - selected.length,
          'lowest_occupancy',
          new Set(selected.map((bed) => bed.id)),
        ),
      );
    }
    return selected;
  }

  private generateBeds() {
    const locations = [
      { name: 'Emergency Department', code: 'ED', licensed: 58, unstaffed: 2 },
      { name: 'Intensive Care Unit', code: 'ICU', licensed: 32, unstaffed: 0 },
      { name: 'Step-down Unit', code: 'SDU', licensed: 44, unstaffed: 2 },
      { name: 'Medical / Surgical', code: 'MS', licensed: 208, unstaffed: 22 },
    ];

    for (const location of locations) {
      for (let index = 0; index < location.licensed; index += 1) {
        const staffed = index < location.licensed - location.unstaffed;
        const roll = this.random();
        let status: BedRecord['status'];
        if (!staffed) status = 'blocked';
        else if (roll < 0.87) status = 'occupied';
        else if (roll < 0.93) status = 'available';
        else if (roll < 0.97) status = 'cleaning';
        else status = 'held';

        this.beds.push({
          id: `BED-${location.code}-${String(index + 1).padStart(3, '0')}`,
          location: location.name,
          code: location.code,
          staffed,
          status,
        });
      }
    }
  }

  private generateQueues() {
    const queueNames = [
      'ED - Waiting for provider',
      'ED - Admission hold',
      'Imaging',
      'Discharge transport',
    ];

    for (let index = 0; index < 420; index += 1) {
      const active = index < 73;
      const queue = queueNames[index % queueNames.length];
      const waitMinutes = active
        ? 12 + Math.floor(this.random() * (queue.includes('Admission') ? 235 : 175))
        : 20 + Math.floor(this.random() * 680);
      this.queues.push({
        id: `QUEUE-${String(index + 1).padStart(4, '0')}`,
        queue,
        enteredAt: Date.now() - waitMinutes * 60_000,
        active,
      });
    }
  }

  private addRole(
    role: string,
    total: number,
    onShift: number,
    eligibleOnShift: number,
    onCall: number,
  ) {
    for (let index = 0; index < total; index += 1) {
      const isOnShift = index < onShift;
      const eligible = !isOnShift || index < eligibleOnShift;
      this.staff.push({
        id: `STAFF-${String(this.staff.length + 1).padStart(4, '0')}`,
        role,
        onShift: isOnShift,
        eligible,
        onCall: !isOnShift && index < onShift + onCall,
        restricted: isOnShift && !eligible,
        fatigueRisk: isOnShift && eligible && index === eligibleOnShift - 1,
      });
    }
  }

  private generateStaff() {
    this.addRole('Emergency RN', 32, 23, 21, 6);
    this.addRole('Critical Care RN', 18, 13, 12, 3);
    this.addRole('Respiratory Therapist', 10, 7, 7, 2);
    this.addRole('Hospitalist', 12, 9, 8, 2);
    this.addRole('Medical / Surgical RN', 60, 45, 43, 10);
    this.addRole('Support Services', 48, 34, 32, 8);
  }

  private generatePolicies() {
    const severities: PolicyRecord['severity'][] = ['low', 'medium', 'high', 'critical'];
    for (let index = 0; index < 58; index += 1) {
      this.policies.push({
        id: `RULE-${String(index + 1).padStart(3, '0')}`,
        code: `SG.RULE.${String(index + 1).padStart(3, '0')}`,
        severity: severities[index % severities.length],
        hard: index % 7 === 0,
        passed: index > 2,
      });
    }
  }

  capacityData(): JsonRecord {
    const staffedBeds = this.beds.filter((bed) => bed.staffed);
    const occupied = staffedBeds.filter((bed) => bed.status === 'occupied').length;
    const statusCount = (status: BedRecord['status']) =>
      staffedBeds.filter((bed) => bed.status === status).length;

    const locationCodes = [...new Set(this.beds.map((bed) => bed.code))];
    const locations = locationCodes.map((code) => {
      const beds = this.beds.filter((bed) => bed.code === code);
      const staffed = beds.filter((bed) => bed.staffed);
      const used = staffed.filter((bed) => bed.status === 'occupied').length;
      const occupancy = staffed.length ? Math.round(used / staffed.length * 100) : 0;
      return {
        name: beds[0].location,
        code,
        occupied: used,
        capacity: staffed.length,
        licensed_capacity: beds.length,
        occupancy_percent: occupancy,
        available: staffed.filter((bed) => bed.status === 'available').length,
        cleaning: staffed.filter((bed) => bed.status === 'cleaning').length,
        held: staffed.filter((bed) => bed.status === 'held').length,
        blocked: beds.filter((bed) => !bed.staffed).length,
        status:
          occupancy >= 92
            ? 'critical'
            : occupancy >= 85
              ? 'strained'
              : occupancy >= 75
                ? 'watch'
                : 'ready',
      };
    });

    return {
      view_type: 'capacity',
      simulation_tick: this.tick,
      record_count: this.recordCount,
      summary: {
        occupied,
        staffed_capacity: staffedBeds.length,
        licensed_capacity: this.beds.length,
        available: statusCount('available'),
        held: statusCount('held'),
        cleaning: statusCount('cleaning'),
        blocked: this.beds.filter((bed) => bed.status === 'blocked').length,
        occupancy_percent: Number((occupied / staffedBeds.length * 100).toFixed(1)),
        surge_spaces_ready: Math.min(12, statusCount('available') + statusCount('cleaning')),
        surge_spaces_blocked: this.beds.filter((bed) => !bed.staffed).length,
      },
      locations,
      freshness: {
        as_of: timestamp(),
        age_seconds: 0,
        status: 'live_simulation',
        source_systems: ['Synthetic ADT', 'Synthetic Bed Management'],
      },
    };
  }

  queueData(): JsonRecord {
    const active = this.queues.filter((entry) => entry.active);
    const thresholds: Record<string, number> = {
      'ED - Waiting for provider': 60,
      'ED - Admission hold': 120,
      Imaging: 45,
      'Discharge transport': 30,
    };
    const queueNames = [...new Set(this.queues.map((entry) => entry.queue))];
    const queues = queueNames.map((queue) => {
      const entries = active.filter((entry) => entry.queue === queue);
      const waits = entries.map((entry) =>
        Math.max(0, Math.floor((Date.now() - entry.enteredAt) / 60_000)));
      const breachCount = waits.filter((wait) => wait > thresholds[queue]).length;
      const averageWait = Math.round(average(waits));
      const p90 = Math.round(percentile(waits, 0.9));
      return {
        name: queue,
        active: entries.length,
        breach_count: breachCount,
        average_wait_minutes: averageWait,
        p90_wait_minutes: p90,
        longest_wait_minutes: Math.max(0, ...waits),
        trend_percent: this.lastEvent === 'arrival_spike' ? 18 : this.lastEvent === 'discharge_wave' ? -12 : 2,
        status: breachCount >= 5 ? 'critical' : breachCount > 0 ? 'strained' : 'watch',
      };
    });
    const breachTotal = queues.reduce((sum, queue) => sum + queue.breach_count, 0);
    const longest = Math.max(0, ...queues.map((queue) => queue.longest_wait_minutes));
    const occupancy = (this.capacityData().summary as JsonRecord).occupancy_percent as number;
    const queueLoad = Math.min(100, active.length / this.queues.length * 100);
    const breachRate = active.length
      ? Math.min(100, breachTotal / active.length * 100)
      : 0;
    const waitSeverity = Math.min(100, longest / 180 * 100);
    const pressureScore = Math.round(
      occupancy * 0.2 +
      queueLoad * 0.4 +
      breachRate * 0.25 +
      waitSeverity * 0.15,
    );

    return {
      view_type: 'queue',
      simulation_tick: this.tick,
      system_pressure: {
        status: pressureScore >= 80 ? 'critical' : pressureScore >= 65 ? 'strained' : 'watch',
        score: pressureScore,
        active_patients: active.length,
        service_level_breaches: breachTotal,
        longest_wait_minutes: longest,
      },
      queues,
      freshness: {
        as_of: timestamp(),
        age_seconds: 0,
        status: 'live_simulation',
      },
    };
  }

  staffingData(): JsonRecord {
    const requiredByRole: Record<string, number> = {
      'Emergency RN': 26,
      'Critical Care RN': 14,
      'Respiratory Therapist': 7,
      Hospitalist: 9,
    };
    const coverage = Object.entries(requiredByRole).map(([role, required]) => {
      const practitioners = this.staff.filter((person) => person.role === role);
      const assigned = practitioners.filter((person) => person.onShift).length;
      const eligible = practitioners.filter((person) => person.onShift && person.eligible).length;
      const gap = Math.max(0, required - eligible);
      const coveragePercent = Math.round(eligible / required * 100);
      return {
        role,
        required,
        assigned,
        eligible,
        gap,
        coverage_percent: coveragePercent,
        status: gap >= 3 ? 'blocked' : gap > 0 ? 'strained' : 'ready',
      };
    });
    const gaps = coverage
      .filter((item) => item.gap > 0)
      .map((item) => ({
        role: item.role,
        count: item.gap,
        starts_at: timestamp(30),
        hard_constraint: true,
        reason: `${item.eligible} eligible staff for a policy minimum of ${item.required}.`,
      }));

    return {
      view_type: 'staffing',
      simulation_tick: this.tick,
      coverage,
      eligible_practitioners: {
        total: this.staff.filter((person) => person.eligible).length,
        on_shift: this.staff.filter((person) => person.onShift).length,
        available_on_call: this.staff.filter((person) => person.onCall && person.eligible).length,
        restricted: this.staff.filter((person) => person.restricted).length,
        fatigue_risk: this.staff.filter((person) => person.fatigueRisk).length,
      },
      gaps,
      freshness: {
        as_of: timestamp(),
        age_seconds: 0,
        status: 'live_simulation',
      },
    };
  }

  incidentData(): JsonRecord {
    const capacity = this.capacityData();
    const queue = this.queueData();
    const staffing = this.staffingData();
    const summary = capacity.summary as JsonRecord;
    const pressure = queue.system_pressure as JsonRecord;
    const gaps = staffing.gaps as JsonRecord[];

    return {
      view_type: 'incident',
      simulation_tick: this.tick,
      incident: {
        incident_id: 'd4b68216-20ec-459a-99aa-cf3d65b99d25',
        incident_number: 'SG-2026-0725',
        name: 'Metro respiratory surge',
        severity: Number(pressure.score) >= 80 ? 'level_3' : 'level_2',
        status: 'activated',
        command_lead: 'Dr. Maya Iyer',
        primary_facility: 'Care360 Central',
        started_at: timestamp(-215),
        situation_summary: `${pressure.active_patients} active queued patients, ${summary.occupancy_percent}% staffed occupancy and ${gaps.length} critical staffing gaps. Last event: ${this.lastEvent.replaceAll('_', ' ')}.`,
      },
      operational_period: {
        operational_period_id: 'd704cb95-8797-4b0e-95bc-0c2e9d3f6245',
        period_number: 3 + Math.floor(this.tick / 4),
        starts_at: timestamp(-95),
        ends_at: timestamp(265),
        next_briefing_at: timestamp(55),
      },
      objectives: [
        {
          label: 'Reduce ED admission holds below 12',
          progress: Math.max(10, 100 - Number(pressure.active_patients)),
          status: Number(pressure.active_patients) > 60 ? 'at_risk' : 'on_track',
        },
        {
          label: 'Open policy-cleared surge beds',
          progress: Math.min(100, Number(summary.available) * 8),
          status: Number(summary.available) >= 8 ? 'on_track' : 'at_risk',
        },
        {
          label: 'Close critical staffing gaps',
          progress: gaps.length ? 38 : 100,
          status: gaps.length ? 'blocked' : 'on_track',
        },
      ],
      tasks: [
        { label: 'Recalculate safe plan options', owner: 'Planning', due_at: timestamp(10), status: 'in_progress' },
        { label: 'Validate staffing eligibility', owner: 'Nursing Ops', due_at: timestamp(20), status: gaps.length ? 'blocked' : 'completed' },
        { label: 'Review current capacity snapshot', owner: 'Patient Flow', due_at: timestamp(5), status: 'completed' },
      ],
    };
  }

  policyData(planId = PLAN_IDS.balanced_decompression): JsonRecord {
    const eligibility = this.planEligibility(planId);
    const violations = eligibility.status === 'clear'
      ? []
      : [{
          code: eligibility.status === 'blocked'
            ? 'STAFFING.MINIMUM.COVERAGE'
            : 'PLAN.CONDITIONAL.CONTROL',
          title: eligibility.status === 'blocked'
            ? 'Minimum qualified staffing coverage'
            : 'Required operational mitigation',
          severity: eligibility.status === 'blocked' ? 'critical' : 'medium',
          constraint_type: eligibility.status === 'blocked' ? 'hard' : 'soft',
          status: 'open',
          overridable: eligibility.status !== 'blocked',
          evidence: eligibility.reason,
          remediation: eligibility.remediation,
        }];

    return {
      view_type: 'policy_gate',
      status: eligibility.status,
      evaluation_session: {
        evaluation_session_id: 'b086fcd7-ab6d-4b58-8e6e-3b24064cc7ef',
        evaluated_at: timestamp(),
        plan_hash: PLAN_HASH,
        rules_evaluated: this.policies.length,
        rules_passed: this.policies.length - violations.length,
        source_snapshot_age_seconds: 0,
      },
      violations,
      evidence: [
        { source: 'Live simulation workforce projection', as_of: timestamp(), status: 'current' },
        { source: 'Live simulation bed registry', as_of: timestamp(), status: 'current' },
        { source: 'Policy release SG-ED-4.2', as_of: '2026-06-30T00:00:00.000Z', status: 'published' },
      ],
    };
  }

  planData(planId = PLAN_IDS.balanced_decompression): JsonRecord {
    const isTransfer = planId === PLAN_IDS.transfer_first;
    const isFast = planId === PLAN_IDS.fast_capacity_release;
    const capacity = this.capacityData().summary as JsonRecord;
    const queue = this.queueData().system_pressure as JsonRecord;
    const eligibility = this.planEligibility(planId);
    const name = isTransfer
      ? 'Transfer-first'
      : isFast
        ? 'Fast capacity release'
        : 'Balanced decompression';
    const choice: PlanChoice = isTransfer
      ? 'transfer_first'
      : isFast
        ? 'fast_capacity_release'
        : 'balanced_decompression';
    const approved = this.approvedPlan === choice;
    const actions = isTransfer
      ? [
          { order: 1, action: 'Confirm three receiving-facility beds', owner: 'Transfer Center', start: timestamp(10), status: 'ready' },
          { order: 2, action: 'Arrange critical-care transport', owner: 'Patient Flow', start: timestamp(20), status: 'ready' },
          { order: 3, action: 'Release transferred beds for cleaning', owner: 'Bed Command', start: timestamp(45), status: 'ready' },
        ]
      : isFast
        ? [
            { order: 1, action: 'Confirm qualified surge staffing', owner: 'Nursing Ops', start: timestamp(5), status: eligibility.status },
            { order: 2, action: 'Release fourteen staffed flex beds', owner: 'Bed Command', start: timestamp(10), status: eligibility.status === 'blocked' ? 'blocked' : 'ready' },
            { order: 3, action: 'Accelerate discharge transport', owner: 'Patient Flow', start: timestamp(15), status: 'ready' },
          ]
        : [
            { order: 1, action: 'Open eight flex beds', owner: 'Bed Command', start: timestamp(20), status: 'ready' },
            { order: 2, action: 'Move discharge-ready patients to lounge', owner: 'Patient Flow', start: timestamp(10), status: 'ready' },
            { order: 3, action: 'Call eligible ED RN pool', owner: 'Nursing Ops', start: timestamp(5), status: eligibility.status },
            { order: 4, action: 'Re-route isolation placements', owner: 'ED Charge', start: timestamp(15), status: 'ready' },
          ];

    return {
      view_type: 'plan',
      plan: {
        candidate_plan_id: planId,
        name,
        rank: isTransfer ? 2 : isFast ? 3 : 1,
        status: approved ? 'approved' : 'pending_approval',
        gate_status: eligibility.status,
        plan_hash: PLAN_HASH,
        created_at: timestamp(),
        assumptions: [
          `Current staffed occupancy is ${capacity.occupancy_percent}%`,
          `${queue.active_patients} active queue entries remain in the live simulation`,
        ],
      },
      actions,
      allocations: {
        beds: isTransfer ? 4 : isFast ? 14 : 8,
        staff_assignments: isTransfer ? 4 : isFast ? 16 : 12,
        transfers: isTransfer ? 6 : isFast ? 1 : 3,
        devices: isTransfer ? 2 : isFast ? 8 : 6,
      },
      scores: {
        safety: isTransfer ? 99 : isFast ? (eligibility.status === 'clear' ? 92 : eligibility.status === 'conditional' ? 84 : 71) : (eligibility.status === 'blocked' ? 78 : 96),
        wait_reduction: isTransfer ? 17 : isFast ? Math.min(38, 23 + Math.round(Number(queue.score) / 10)) : Math.min(28, 15 + Math.round(Number(queue.score) / 10)),
        time_to_effect_minutes: isTransfer ? 62 : isFast ? 24 : 38,
        cost_index: isTransfer ? 1.32 : isFast ? 1.08 : 1.14,
      },
      approvals: approved
        ? [
            { role: 'Incident Commander', status: 'approved' },
            { role: 'Nursing Supervisor', status: 'approved' },
            { role: 'Safety Officer', status: 'approved' },
          ]
        : [
            { role: 'Incident Commander', status: 'pending' },
            { role: 'Nursing Supervisor', status: 'pending' },
            { role: 'Safety Officer', status: 'pending' },
          ],
    };
  }

  comparisonData(priority = 'balanced', force = false): JsonRecord {
    const lockedSnapshot = this.planningSnapshots.get(priority);
    if (!force && lockedSnapshot) {
      return lockedSnapshot;
    }

    const pressure = this.queueData().system_pressure as JsonRecord;
    const baseRelief = Math.min(28, 15 + Math.round(Number(pressure.score) / 10));
    const totalGap = (this.staffingData().gaps as JsonRecord[])
      .reduce((sum, gap) => sum + Number(gap.count), 0);
    const balancedEligibility = this.planEligibility(PLAN_IDS.balanced_decompression);
    const fastEligibility = this.planEligibility(PLAN_IDS.fast_capacity_release);
    const transferEligibility = this.planEligibility(PLAN_IDS.transfer_first);
    const balanced = {
      candidate_plan_id: PLAN_IDS.balanced_decompression,
      name: 'Balanced decompression',
      gate_status: balancedEligibility.status,
      wait_reduction_percent: baseRelief,
      safety_score: balancedEligibility.status === 'blocked' ? 78 : 96,
      staffing_gap: Math.max(0, totalGap - 5),
      beds_opened: 8,
      time_to_effect_minutes: 38,
      cost_index: 1.14,
      eligibility_reason: balancedEligibility.reason,
    };
    const fast = {
      candidate_plan_id: PLAN_IDS.fast_capacity_release,
      name: 'Fast capacity release',
      gate_status: fastEligibility.status,
      wait_reduction_percent: Math.min(38, baseRelief + 8),
      safety_score: fastEligibility.status === 'clear'
        ? 92
        : fastEligibility.status === 'conditional'
          ? 84
          : 71,
      staffing_gap: Math.max(0, totalGap - 3),
      beds_opened: 14,
      time_to_effect_minutes: 24,
      cost_index: 1.08,
      eligibility_reason: fastEligibility.reason,
    };
    const transfer = {
      candidate_plan_id: PLAN_IDS.transfer_first,
      name: 'Transfer-first',
      gate_status: transferEligibility.status,
      wait_reduction_percent: Math.max(10, baseRelief - 6),
      safety_score: 99,
      staffing_gap: Math.max(0, totalGap - 8),
      beds_opened: 4,
      time_to_effect_minutes: 62,
      cost_index: 1.32,
      eligibility_reason: transferEligibility.reason,
    };
    const order = priority === 'maximum_safety'
      ? [transfer, balanced, fast]
      : priority === 'fastest_relief'
        ? [fast, balanced, transfer]
        : [balanced, transfer, fast];
    const ranked = [
      ...order.filter((plan) => plan.gate_status !== 'blocked'),
      ...order.filter((plan) => plan.gate_status === 'blocked'),
    ].map((plan, index) => ({
      ...plan,
      rank: index + 1,
      recommendation: index === 0
        ? 'best_safe_tradeoff'
        : plan.gate_status === 'blocked'
          ? 'ineligible'
          : 'safe_alternative',
    }));
    const preferred = ranked[0];
    const blockedPlanIds = ranked
      .filter((plan) => plan.gate_status === 'blocked')
      .map((plan) => plan.candidate_plan_id);

    const snapshot = {
      view_type: 'plan_comparison',
      simulation_tick: this.tick,
      comparison: ranked,
      dominance: {
        preferred_plan_id: preferred.candidate_plan_id,
        rationale: `${preferred.name} is the highest-ranked currently eligible option. ${preferred.eligibility_reason}`,
        blocked_plan_ids: blockedPlanIds,
      },
      tradeoffs: [
        `Current system pressure is ${pressure.score}/100, so projected benefit is recalculated from the live simulation.`,
        `Fast capacity release: ${fastEligibility.reason}`,
        `Balanced decompression: ${balancedEligibility.reason}`,
        `Transfer-first: ${transferEligibility.reason}`,
      ],
    };
    this.planningSnapshots.set(priority, snapshot);
    return snapshot;
  }

  regenerateComparison(priority = 'balanced') {
    return this.comparisonData(priority, true);
  }

  approve(choice: PlanChoice) {
    const selectedPlanId = choice === 'transfer_first'
      ? PLAN_IDS.transfer_first
      : choice === 'fast_capacity_release'
        ? PLAN_IDS.fast_capacity_release
        : PLAN_IDS.balanced_decompression;
    const eligibility = this.planEligibility(selectedPlanId);
    if (eligibility.status === 'blocked') {
      surgeRepository.recordAudit(
        'plan_approval_blocked',
        'Policy Gate',
        `${choice.replaceAll('_', ' ')} could not be approved: ${eligibility.reason}`,
        { plan: choice, policy_gate: eligibility.status },
      );
      return;
    }
    this.approvedPlan = choice;
    this.executionStatus = 'not_started';
    this.executionProgress = 0;
    this.persistState();
    surgeRepository.recordAudit(
      'plan_approved',
      'Incident Commander',
      `${choice === 'transfer_first' ? 'Transfer-first' : choice === 'fast_capacity_release' ? 'Fast capacity release' : 'Balanced decompression'} approved for simulated execution.`,
      { plan: choice, policy_gate: this.planEligibility(this.currentPlanId()).status },
    );
  }

  execute(
    choice: PlanChoice,
    pace: 'cautious' | 'standard' | 'rapid' = 'standard',
  ) {
    if (this.executionStatus === 'completed' && this.approvedPlan === choice) {
      return;
    }

    if (this.approvedPlan !== choice) {
      this.executionStatus = 'failed';
      this.executionProgress = 0;
      this.persistState();
      surgeRepository.recordAudit(
        'execution_blocked',
        'Policy Gate',
        'Execution blocked because the selected plan does not have a matching approval.',
        { requested_plan: choice, approved_plan: this.approvedPlan },
      );
      return;
    }

    const selectedPlanId = choice === 'transfer_first'
      ? PLAN_IDS.transfer_first
      : choice === 'fast_capacity_release'
        ? PLAN_IDS.fast_capacity_release
        : PLAN_IDS.balanced_decompression;
    const eligibility = this.planEligibility(selectedPlanId);
    if (eligibility.status === 'blocked') {
      this.executionStatus = 'failed';
      this.executionProgress = 0;
      this.persistState();
      surgeRepository.recordAudit(
        'execution_blocked',
        'Policy Gate',
        `Execution blocked after live re-evaluation: ${eligibility.reason}`,
        { requested_plan: choice, policy_gate: eligibility.status },
      );
      return;
    }

    this.executionStatus = 'running';
    const progressByPace = {
      cautious: 20,
      standard: 35,
      rapid: 50,
    };
    this.executionProgress = Math.min(
      100,
      this.executionProgress + progressByPace[pace],
    );
    const bedsCleaned = this.selectBedsAcrossUnits(
      'cleaning',
      2,
      'highest_occupancy',
    );
    bedsCleaned.forEach((bed) => { bed.status = 'available'; });
    const bedsDischarged = this.selectBedsAcrossUnits(
      'occupied',
      2,
      'highest_occupancy',
    );
    bedsDischarged.forEach((bed) => { bed.status = 'cleaning'; });
    const changedBeds = [...bedsCleaned, ...bedsDischarged];
    const queuesToComplete = this.queues.filter((entry) => entry.active).slice(0, 8);
    queuesToComplete.forEach((entry) => { entry.active = false; });
    this.tick += 1;
    if (this.executionProgress === 100) this.executionStatus = 'completed';
    surgeRepository.saveBeds(changedBeds);
    surgeRepository.saveQueues(queuesToComplete);
    this.persistState();
    surgeRepository.recordAudit(
      this.executionStatus === 'completed' ? 'execution_completed' : 'execution_advanced',
      'SurgeGuard Orchestrator',
      `Execution advanced to ${this.executionProgress}% at ${pace} pace.`,
      {
        plan: choice,
        pace,
        beds_cleaned: bedsCleaned.length,
        patients_discharged: bedsDischarged.length,
        queue_entries_completed: queuesToComplete.length,
      },
    );
  }

  executionData(): JsonRecord {
    const approved = this.approvedPlan !== null;
    const status = this.executionStatus === 'not_started'
      ? 'queued'
      : this.executionStatus;
    const progress = this.executionProgress;
    const failedForApproval = status === 'failed' && !approved;

    return {
      view_type: 'execution',
      simulation_tick: this.tick,
      execution: {
        plan_execution_id: EXECUTION_ID,
        plan_name: this.approvedPlan === 'transfer_first'
          ? 'Transfer-first'
          : this.approvedPlan === 'fast_capacity_release'
            ? 'Fast capacity release'
            : 'Balanced decompression',
        status,
        progress_percent: progress,
        started_at: timestamp(-Math.max(1, this.tick * 3)),
        expected_complete_at: timestamp(Math.max(5, 75 - progress)),
        policy_gate_status: approved ? 'clear' : 'not_evaluated',
        last_gate_at: timestamp(),
      },
      steps: [
        { sequence: 1, name: 'Verify recorded approval', owner: 'Automation', status: approved ? 'succeeded' : 'failed' },
        { sequence: 2, name: 'Revalidate source snapshot', owner: 'Automation', status: approved ? 'succeeded' : 'queued' },
        { sequence: 3, name: 'Release safe capacity', owner: 'Bed Command', status: progress >= 35 ? 'running' : 'queued', progress },
        { sequence: 4, name: 'Confirm staffing assignments', owner: 'Nursing Ops', status: progress >= 70 ? 'running' : 'queued', progress: Math.max(0, progress - 35) },
        { sequence: 5, name: 'Measure observed relief', owner: 'Patient Flow', status: progress >= 100 ? 'succeeded' : 'queued' },
      ],
      deviations: failedForApproval
        ? [{
            severity: 'high',
            description: 'Execution was requested before a matching plan approval was recorded.',
            corrective_action: 'Run approve_safe_plan first, then execute the same plan.',
            gate_impact: 'blocked',
          }]
        : [],
      metrics: {
        projected_wait_reduction_percent: 23,
        observed_wait_reduction_percent: Math.round(progress * 0.18),
        beds_released: Math.floor(progress / 25),
        staff_confirmed: Math.floor(progress / 30),
        rollback_ready: true,
      },
    };
  }

  commandCenterData(priority = 'balanced'): JsonRecord {
    const incident = this.incidentData();
    const capacity = this.capacityData();
    const queue = this.queueData();
    const staffing = this.staffingData();
    const comparison = this.comparisonData(priority);
    const balancedGate = this.policyData(PLAN_IDS.balanced_decompression);
    const fastGate = this.policyData(PLAN_IDS.fast_capacity_release);
    const transferGate = this.policyData(PLAN_IDS.transfer_first);
    return {
      view_type: 'command_center',
      simulation_tick: this.tick,
      last_event: this.lastEvent,
      database: surgeRepository.databaseStats(),
      incident,
      capacity,
      queue,
      staffing,
      planning: comparison,
      policy_gates: {
        balanced_decompression: balancedGate,
        fast_capacity_release: fastGate,
        transfer_first: transferGate,
      },
      selected_plan: this.approvedPlan,
      execution: this.executionData(),
      timeline: surgeRepository.timeline(12),
      available_actions: {
        surge_events: ['arrival_spike', 'staff_callout', 'beds_cleaned', 'discharge_wave'],
        planning_priorities: ['balanced', 'fastest_relief', 'maximum_safety'],
        selectable_plans: ['balanced_decompression', 'fast_capacity_release', 'transfer_first'],
        execution_paces: ['cautious', 'standard', 'rapid'],
      },
    };
  }

  applyEvent(event: SurgeEvent) {
    const presets: Record<SurgeEvent, CustomSurgeScenario> = {
      arrival_spike: { arrivals: 18, rnChange: 0, bedsCleaned: 0, discharges: 0 },
      staff_callout: { arrivals: 0, rnChange: -3, bedsCleaned: 0, discharges: 0 },
      beds_cleaned: { arrivals: 0, rnChange: 0, bedsCleaned: 10, discharges: 0 },
      discharge_wave: { arrivals: 0, rnChange: 0, bedsCleaned: 0, discharges: 12 },
    };
    this.applyScenario(presets[event], event);
  }

  applyScenario(
    input: CustomSurgeScenario,
    label: SurgeEvent | 'custom_scenario' = 'custom_scenario',
  ) {
    const scenario: CustomSurgeScenario = {
      arrivals: clampInteger(input.arrivals, 0, 60),
      queueCompletions: clampInteger(input.queueCompletions ?? 0, 0, 420),
      rnChange: clampInteger(input.rnChange, -12, 12),
      bedsCleaned: clampInteger(input.bedsCleaned, 0, 30),
      discharges: clampInteger(input.discharges, 0, 40),
    };
    this.lastEvent = label;
    this.tick += 1;
    this.approvedPlan = null;
    this.executionStatus = 'not_started';
    this.executionProgress = 0;
    this.planningSnapshots.clear();
    this.lastLiveAdvanceAt = Date.now();
    this.livePauseUntil = this.lastLiveAdvanceAt + 5_000;
    const changedBeds: BedRecord[] = [];
    const changedQueues: QueueRecord[] = [];
    const changedStaff: StaffRecord[] = [];
    const changedBedIds = new Set<string>();
    const trackBed = (bed: BedRecord) => {
      if (changedBedIds.has(bed.id)) return;
      changedBedIds.add(bed.id);
      changedBeds.push(bed);
    };

    if (scenario.bedsCleaned > 0) {
      this.selectBedsAcrossUnits(
        'cleaning',
        scenario.bedsCleaned,
        'highest_occupancy',
      ).forEach((bed) => {
          bed.status = 'available';
          trackBed(bed);
        });
    }

    if (scenario.discharges > 0) {
      this.selectBedsAcrossUnits(
        'occupied',
        scenario.discharges,
        'highest_occupancy',
      ).forEach((bed) => {
          bed.status = 'cleaning';
          trackBed(bed);
        });
      this.queues
        .filter((entry) => entry.active)
        .slice(0, scenario.discharges)
        .forEach((entry) => {
          entry.active = false;
          changedQueues.push(entry);
        });
    }

    if (scenario.queueCompletions && scenario.queueCompletions > 0) {
      this.queues
        .filter((entry) => entry.active)
        .slice(0, scenario.queueCompletions)
        .forEach((entry) => {
          entry.active = false;
          changedQueues.push(entry);
        });
    }

    if (scenario.arrivals > 0) {
      this.queues
        .filter((entry) => !entry.active)
        .slice(0, scenario.arrivals)
        .forEach((entry, index) => {
        entry.active = true;
        entry.enteredAt = Date.now() - (15 + index * 4) * 60_000;
          changedQueues.push(entry);
      });
      this.selectArrivalBeds(scenario.arrivals).forEach((bed) => {
        bed.status = 'occupied';
        trackBed(bed);
      });
    }

    if (scenario.rnChange < 0) {
      this.staff
        .filter((person) => person.role === 'Emergency RN' && person.onShift && person.eligible)
        .slice(0, Math.abs(scenario.rnChange))
        .forEach((person) => {
          person.onShift = false;
          person.eligible = false;
          person.restricted = true;
          changedStaff.push(person);
        });
    }

    if (scenario.rnChange > 0) {
      this.staff
        .filter((person) => person.role === 'Emergency RN' && !person.onShift)
        .slice(0, scenario.rnChange)
        .forEach((person) => {
          person.onShift = true;
          person.eligible = true;
          person.restricted = false;
          changedStaff.push(person);
        });
    }

    if (changedBeds.length) surgeRepository.saveBeds(changedBeds);
    if (changedQueues.length) surgeRepository.saveQueues(changedQueues);
    if (changedStaff.length) surgeRepository.saveStaff(changedStaff);
    this.persistState();
    surgeRepository.recordAudit(
      'scenario_applied',
      'Incident Commander',
      `${label.replaceAll('_', ' ')} applied: ${scenario.arrivals} arrivals, ${scenario.queueCompletions ?? 0} queue completions, ${scenario.rnChange >= 0 ? '+' : ''}${scenario.rnChange} ED RNs, ${scenario.bedsCleaned} beds cleaned and ${scenario.discharges} discharges.`,
      {
        event: label,
        requested: scenario,
        beds_changed: changedBeds.length,
        queue_entries_changed: changedQueues.length,
        staff_changed: changedStaff.length,
      },
    );
  }
}

export const surgeSimulation = new SurgeSimulation();
export { PLAN_IDS };
