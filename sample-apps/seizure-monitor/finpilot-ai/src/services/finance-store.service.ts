import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive
  direction: 'debit' | 'credit'; // debit = expense, credit = income
  category?: string;
}

export interface RiskFlag {
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  saved_so_far: number;
  created_at: string;
}

export interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface GroupExpense {
  id: string;
  description: string;
  total_amount: number;
  paid_by: string;
  group_name: string;
  participants: string[];
  split_method: 'equal' | 'percentage' | 'exact' | 'shares';
  per_person_shares: Record<string, number>;
  created_at: string;
}

export interface Group {
  name: string;
  participants: Set<string>;
  expenses: GroupExpense[];
}

export interface NotificationItem {
  id: string;
  type: 'interactive' | 'warning' | 'reminder';
  title: string;
  message: string;
  recipient?: string;
  trigger_source?: string;
  status: 'pending' | 'sent' | 'acknowledged';
  scheduled_at: string;
  created_at: string;
}

export interface CalendarSyncRecord {
  id: string;
  title: string;
  description?: string;
  date: string;
  category: 'sip_due' | 'bill_due' | 'settlement_deadline' | 'general';
  primary_event_id: string;
  secondary_event_id?: string;
  created_at: string;
}

export interface HealthScoreHistoryRecord {
  timestamp: string;
  score: number;
  band: string;
}

export interface EmergencyFundState {
  saved: number;
  target: number;
  months_coverage: number;
  status: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'finpilot_store.json');

/**
 * FinanceStore — Persistent & Short/Long-Term Memory Database Service for FinPilot AI
 *
 * Maintains short-term session state, workflow memory, and long-term financial health history.
 */
@Injectable()
export class FinanceStore {
  private transactions = new Map<string, Transaction>();
  private goals = new Map<string, Goal>();
  private groups = new Map<string, Group>();
  private notifications = new Map<string, NotificationItem>();
  private calendarEvents = new Map<string, CalendarSyncRecord>();
  private monthlyIncome: number | null = null;
  private riskProfile: string = 'medium';
  private emergencyFundState: EmergencyFundState | null = null;
  private healthHistory: HealthScoreHistoryRecord[] = [];
  private shortTermMemory = new Map<string, any>();
  private idCounter = 0;

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);

        if (Array.isArray(data.transactions)) {
          for (const t of data.transactions) this.transactions.set(t.id, t);
        }
        if (Array.isArray(data.goals)) {
          for (const g of data.goals) this.goals.set(g.id, g);
        }
        if (data.groups && typeof data.groups === 'object') {
          for (const [name, gData] of Object.entries<any>(data.groups)) {
            this.groups.set(name, {
              name,
              participants: new Set(gData.participants || []),
              expenses: gData.expenses || [],
            });
          }
        }
        if (Array.isArray(data.notifications)) {
          for (const n of data.notifications) this.notifications.set(n.id, n);
        }
        if (Array.isArray(data.calendarEvents)) {
          for (const c of data.calendarEvents) this.calendarEvents.set(c.id, c);
        }
        if (typeof data.monthlyIncome === 'number') {
          this.monthlyIncome = data.monthlyIncome;
        }
        if (typeof data.riskProfile === 'string') {
          this.riskProfile = data.riskProfile;
        }
        if (data.emergencyFundState && typeof data.emergencyFundState === 'object') {
          this.emergencyFundState = data.emergencyFundState;
        }
        if (Array.isArray(data.healthHistory)) {
          this.healthHistory = data.healthHistory;
        }
        if (typeof data.idCounter === 'number') {
          this.idCounter = data.idCounter;
        }
      }
    } catch (e) {
      // Fallback gracefully on initialization error
    }
  }

  private saveDatabase(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const serializableGroups: Record<string, { name: string; participants: string[]; expenses: GroupExpense[] }> = {};
      for (const [name, group] of this.groups.entries()) {
        serializableGroups[name] = {
          name: group.name,
          participants: Array.from(group.participants),
          expenses: group.expenses,
        };
      }

      const payload = {
        monthlyIncome: this.monthlyIncome,
        riskProfile: this.riskProfile,
        emergencyFundState: this.emergencyFundState,
        healthHistory: this.healthHistory,
        idCounter: this.idCounter,
        transactions: Array.from(this.transactions.values()),
        goals: Array.from(this.goals.values()),
        groups: serializableGroups,
        notifications: Array.from(this.notifications.values()),
        calendarEvents: Array.from(this.calendarEvents.values()),
        last_updated: new Date().toISOString(),
      };

      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      // Ignore background file write errors gracefully
    }
  }

  private nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}_${Date.now().toString(36)}${this.idCounter}`;
  }

  // ---------- Short-Term Session Memory ----------

  setShortTermMemory(key: string, value: any): void {
    this.shortTermMemory.set(key, value);
  }

  getShortTermMemory<T = any>(key: string): T | undefined {
    return this.shortTermMemory.get(key) as T;
  }

  clearShortTermMemory(): void {
    this.shortTermMemory.clear();
  }

  // ---------- Long-Term Financial Memory ----------

  setRiskProfile(profile: string): void {
    this.riskProfile = profile;
    this.saveDatabase();
  }

  getRiskProfile(): string {
    return this.riskProfile;
  }

  setEmergencyFundState(state: EmergencyFundState): void {
    this.emergencyFundState = state;
    this.saveDatabase();
  }

  getEmergencyFundState(): EmergencyFundState | null {
    return this.emergencyFundState;
  }

  addHealthHistory(score: number, band: string): void {
    this.healthHistory.push({
      timestamp: new Date().toISOString(),
      score,
      band,
    });
    if (this.healthHistory.length > 50) this.healthHistory.shift();
    this.saveDatabase();
  }

  getHealthHistory(): HealthScoreHistoryRecord[] {
    return this.healthHistory;
  }

  // ---------- Transactions ----------

  addTransaction(t: Omit<Transaction, 'id'>): Transaction {
    const record: Transaction = { id: this.nextId('txn'), ...t };
    this.transactions.set(record.id, record);
    this.saveDatabase();
    return record;
  }

  listTransactions(): Transaction[] {
    return [...this.transactions.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  updateCategory(id: string, category: string): void {
    const t = this.transactions.get(id);
    if (t) {
      t.category = category;
      this.saveDatabase();
    }
  }

  setMonthlyIncome(amount: number): void {
    this.monthlyIncome = amount;
    this.saveDatabase();
  }

  getMonthlyIncome(): number | null {
    return this.monthlyIncome;
  }

  // ---------- Goals ----------

  addGoal(goal: Omit<Goal, 'id' | 'created_at'>): Goal {
    const record: Goal = { id: this.nextId('goal'), created_at: new Date().toISOString(), ...goal };
    this.goals.set(record.id, record);
    this.saveDatabase();
    return record;
  }

  listGoals(): Goal[] {
    return [...this.goals.values()].sort((a, b) => a.target_date.localeCompare(b.target_date));
  }

  getGoal(id: string): Goal | undefined {
    return this.goals.get(id);
  }

  updateGoalSaved(id: string, savedSoFar: number): Goal | undefined {
    const g = this.goals.get(id);
    if (g) {
      g.saved_so_far = savedSoFar;
      this.saveDatabase();
    }
    return g;
  }

  // ---------- Group Expenses ----------

  getOrCreateGroup(groupName: string): Group {
    let group = this.groups.get(groupName);
    if (!group) {
      group = { name: groupName, participants: new Set<string>(), expenses: [] };
      this.groups.set(groupName, group);
      this.saveDatabase();
    }
    return group;
  }

  addParticipantToGroup(groupName: string, participantName: string): Group {
    const group = this.getOrCreateGroup(groupName);
    group.participants.add(participantName);
    this.saveDatabase();
    return group;
  }

  addGroupExpense(expense: Omit<GroupExpense, 'id' | 'created_at'>): GroupExpense {
    const record: GroupExpense = {
      id: this.nextId('gexp'),
      created_at: new Date().toISOString(),
      ...expense,
    };
    const group = this.getOrCreateGroup(expense.group_name);
    expense.participants.forEach((p) => group.participants.add(p));
    group.participants.add(expense.paid_by);
    group.expenses.push(record);
    this.saveDatabase();
    return record;
  }

  getGroup(groupName: string): Group | undefined {
    return this.groups.get(groupName);
  }

  listGroups(): Group[] {
    return [...this.groups.values()];
  }

  // ---------- Notifications ----------

  addNotification(n: Omit<NotificationItem, 'id' | 'created_at'>): NotificationItem {
    const record: NotificationItem = {
      id: this.nextId('notif'),
      created_at: new Date().toISOString(),
      ...n,
    };
    this.notifications.set(record.id, record);
    this.saveDatabase();
    return record;
  }

  listNotifications(type?: string): NotificationItem[] {
    const all = [...this.notifications.values()];
    if (type) return all.filter((n) => n.type === type);
    return all;
  }

  // ---------- Calendar Events ----------

  addCalendarRecord(rec: Omit<CalendarSyncRecord, 'id' | 'created_at'>): CalendarSyncRecord {
    const record: CalendarSyncRecord = {
      id: this.nextId('cal'),
      created_at: new Date().toISOString(),
      ...rec,
    };
    this.calendarEvents.set(record.id, record);
    this.saveDatabase();
    return record;
  }

  listCalendarRecords(): CalendarSyncRecord[] {
    return [...this.calendarEvents.values()];
  }
}
