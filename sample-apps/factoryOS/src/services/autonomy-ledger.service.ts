import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export interface AutonomyActionInput {
  agentName: 'Maintenance' | 'Inventory' | 'Procurement' | 'Production' | 'Safety' | string;
  actionType: string;
  inputSummary: string;
  decision: string;
  confidence: number;
  reasoning: string;
  policyParams: Record<string, any>;
}

export interface AutonomyActionEntry extends AutonomyActionInput {
  id: string;
  timestamp: string;
  autonomyLevel: 'Auto-Executed' | 'Monitored' | 'Human-Approval-Required' | string;
  status: 'EXECUTED' | 'LOGGED' | 'PENDING_APPROVAL';
}

@Injectable()
export class AutonomyLedgerService {
  private DATA_DIR = path.join(process.cwd(), 'data');
  private LEDGER_PATH = path.join(this.DATA_DIR, 'autonomy_ledger.json');
  private ledger: AutonomyActionEntry[] = [];

  constructor() {
    this.loadLedger();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
    }
  }

  private loadLedger() {
    try {
      this.ensureDataDir();
      if (fs.existsSync(this.LEDGER_PATH)) {
        const raw = fs.readFileSync(this.LEDGER_PATH, 'utf-8');
        this.ledger = JSON.parse(raw);
      }
    } catch {
      this.ledger = [];
    }
  }

  private saveLedger() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(this.LEDGER_PATH, JSON.stringify(this.ledger, null, 2));
    } catch (err: any) {
      console.error(`AutonomyLedger: Failed to persist ledger: ${err.message}`);
    }
  }

  recordAction(input: AutonomyActionInput): AutonomyActionEntry {
    const entryId = `LEDGER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let autonomyLevel: string = 'Auto-Executed';
    let status: 'EXECUTED' | 'LOGGED' | 'PENDING_APPROVAL' = 'EXECUTED';

    if (input.actionType === 'shutdown_machine') {
      const risk = input.policyParams.riskLevel ?? 0;
      autonomyLevel = risk >= 8 ? 'Auto-Executed (Critical Safety Floor)' : 'Monitored (Notification Sent)';
      status = 'EXECUTED';
    } else if (input.actionType === 'create_purchase_order') {
      const amount = input.policyParams.amount ?? 0;
      if (amount > 10000) {
        autonomyLevel = 'Human-Approval-Required (Exceeds Policy Floor)';
        status = 'PENDING_APPROVAL';
      } else {
        autonomyLevel = 'Auto-Executed (Within Pre-Approved Budget)';
        status = 'EXECUTED';
      }
    } else if (input.actionType === 'reroute_production') {
      autonomyLevel = input.policyParams.safetyFlag ? 'Auto-Executed (Safety Override)' : 'Auto-Executed (Capacity Rebalance)';
      status = 'EXECUTED';
    } else if (input.confidence >= 0.9) {
      autonomyLevel = 'Auto-Executed';
      status = 'EXECUTED';
    } else if (input.confidence >= 0.7) {
      autonomyLevel = 'Monitored';
      status = 'LOGGED';
    } else {
      autonomyLevel = 'Human-Approval-Required';
      status = 'PENDING_APPROVAL';
    }

    const entry: AutonomyActionEntry = {
      ...input,
      id: entryId,
      timestamp: new Date().toISOString(),
      autonomyLevel,
      status,
    };

    this.ledger.push(entry);
    this.saveLedger();
    return entry;
  }

  getLedger(): AutonomyActionEntry[] {
    return [...this.ledger];
  }

  getLedgerByAgent(agentName: string): AutonomyActionEntry[] {
    return this.ledger.filter((entry) => entry.agentName.toLowerCase() === agentName.toLowerCase());
  }

  clearLedger() {
    this.ledger = [];
    this.saveLedger();
  }
}

export const autonomyLedger = new AutonomyLedgerService();
