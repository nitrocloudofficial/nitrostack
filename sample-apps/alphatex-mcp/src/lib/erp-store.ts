/**
 * AlphaTex ERP - Central Unified Data Store (erp-store.ts)
 * Maintains in-memory state with sample data for Items, Parties, Invoices,
 * Credit/Debit Notes, Payments, Ledger Entries, and Bank Accounts.
 */

export interface ItemRecord {
  id: string;
  name: string;
  code: string;
  hsn: string;
  unit: string;
  rate: number;
  taxRatePct: number;
  currentStock: number;
  minStockWarning: number;
}

export interface PartyRecord {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  stateCode: string;
  openingBalance: number;
  balanceType: 'Receivable' | 'Payable';
  currentBalance: number;
}

export interface PaymentRecord {
  id: string;
  partyName: string;
  amount: number;
  date: string;
  type: 'RECEIVED' | 'PAID';
  paymentMode: 'CASH' | 'CHEQUE' | 'UPI' | 'NEFT';
  referenceNo: string;
  notes?: string;
}

export interface NoteRecord {
  id: string;
  noteNo: string;
  type: 'CREDIT' | 'DEBIT';
  partyName: string;
  date: string;
  reason: string;
  amount: number;
  taxRatePct: number;
  totalAmount: number;
}

export interface BankAccountRecord {
  id: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  accountType: string;
}

export interface ChequeRecord {
  id: string;
  chequeNo: string;
  date: string;
  partyName: string;
  amount: number;
  bankName: string;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
  type: 'ISSUED' | 'RECEIVED';
}

class ERPStore {
  private items: Map<string, ItemRecord> = new Map();
  private parties: Map<string, PartyRecord> = new Map();
  private payments: PaymentRecord[] = [];
  private notes: NoteRecord[] = [];
  private bankAccounts: BankAccountRecord[] = [];
  private cheques: ChequeRecord[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed Items
    const sampleItems: ItemRecord[] = [
      {
        id: 'ITM-001',
        name: '100% Combed Cotton Yarn 30s',
        code: 'YRN-30S',
        hsn: '5205',
        unit: 'Kgs',
        rate: 280,
        taxRatePct: 5,
        currentStock: 1250,
        minStockWarning: 200,
      },
      {
        id: 'ITM-002',
        name: 'Carded Cotton Yarn 40s',
        code: 'YRN-40S',
        hsn: '5205',
        unit: 'Kgs',
        rate: 310,
        taxRatePct: 5,
        currentStock: 850,
        minStockWarning: 150,
      },
      {
        id: 'ITM-003',
        name: 'Bio-Wash Hosiery Fabric (Navy Blue)',
        code: 'FAB-NAVY',
        hsn: '6006',
        unit: 'Meters',
        rate: 450,
        taxRatePct: 12,
        currentStock: 500,
        minStockWarning: 100,
      },
      {
        id: 'ITM-004',
        name: 'Reactive Textile Dye (Royal Blue)',
        code: 'DYE-RBL',
        hsn: '3204',
        unit: 'Kgs',
        rate: 620,
        taxRatePct: 18,
        currentStock: 120,
        minStockWarning: 30,
      },
    ];
    sampleItems.forEach(i => this.items.set(i.id, i));

    // Seed Parties
    const sampleParties: PartyRecord[] = [
      {
        id: 'PRT-001',
        name: 'Apex Fabrics & Garments Ltd.',
        gstin: '33BBBBB1111B2Z2',
        phone: '+91 91234 56789',
        email: 'purchase@apexfabrics.com',
        address: '45 Fashion Highway, Erode, Tamil Nadu - 638001',
        state: 'Tamil Nadu',
        stateCode: '33',
        openingBalance: 50000,
        balanceType: 'Receivable',
        currentBalance: 191650,
      },
      {
        id: 'PRT-002',
        name: 'Vardhaman Spinning Mills',
        gstin: '27AAAAA9999A1Z1',
        phone: '+91 98220 11223',
        email: 'sales@vardhamanmills.com',
        address: 'Industrial Estate, Ludhiana, Punjab - 141003',
        state: 'Punjab',
        stateCode: '03',
        openingBalance: 120000,
        balanceType: 'Payable',
        currentBalance: 120000,
      },
      {
        id: 'PRT-003',
        name: 'Sri Krishna Dyers & Printers',
        gstin: '33CCCC3333C3Z3',
        phone: '+91 94433 88776',
        email: 'info@krishnadyers.in',
        address: '88SIPCOT Industrial Complex, Perundurai, Tamil Nadu - 638052',
        state: 'Tamil Nadu',
        stateCode: '33',
        openingBalance: 0,
        balanceType: 'Receivable',
        currentBalance: 35000,
      },
    ];
    sampleParties.forEach(p => this.parties.set(p.id, p));

    // Seed Bank Accounts
    this.bankAccounts.push({
      id: 'BNK-001',
      bankName: 'State Bank of India',
      accountNo: '39847192834',
      ifsc: 'SBIN0001234',
      branch: 'Main Branch, Tirupur',
      accountType: 'Current Account',
    });

    // Seed Payments
    this.payments.push({
      id: 'PAY-001',
      partyName: 'Apex Fabrics & Garments Ltd.',
      amount: 50000,
      date: '2026-07-25',
      type: 'RECEIVED',
      paymentMode: 'NEFT',
      referenceNo: 'N29384729102',
      notes: 'Advance against upcoming yarn order',
    });

    // Seed Cheques
    this.cheques.push({
      id: 'CHQ-001',
      chequeNo: '004921',
      date: '2026-08-05',
      partyName: 'Vardhaman Spinning Mills',
      amount: 60000,
      bankName: 'State Bank of India',
      status: 'PENDING',
      type: 'ISSUED',
    });
  }

  // --- ITEM METHODS ---
  addItem(item: Omit<ItemRecord, 'id'>): ItemRecord {
    const id = `ITM-${String(this.items.size + 1).padStart(3, '0')}`;
    const newRecord: ItemRecord = { id, ...item };
    this.items.set(id, newRecord);
    return newRecord;
  }

  getItems(): ItemRecord[] {
    return Array.from(this.items.values());
  }

  getItemByQuery(query: string): ItemRecord | undefined {
    const q = query.toLowerCase();
    return this.getItems().find(
      i => i.name.toLowerCase().includes(q) || i.code.toLowerCase() === q || i.hsn === q
    );
  }

  updateStock(id: string, deltaQty: number): ItemRecord | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;
    item.currentStock += deltaQty;
    return item;
  }

  // --- PARTY METHODS ---
  addParty(party: Omit<PartyRecord, 'id' | 'currentBalance'>): PartyRecord {
    const id = `PRT-${String(this.parties.size + 1).padStart(3, '0')}`;
    const newRecord: PartyRecord = {
      id,
      ...party,
      currentBalance: party.openingBalance,
    };
    this.parties.set(id, newRecord);
    return newRecord;
  }

  getParties(): PartyRecord[] {
    return Array.from(this.parties.values());
  }

  getPartyByName(name: string): PartyRecord | undefined {
    const n = name.toLowerCase();
    return this.getParties().find(p => p.name.toLowerCase().includes(n));
  }

  updatePartyBalance(partyName: string, deltaAmount: number) {
    const party = this.getPartyByName(partyName);
    if (party) {
      party.currentBalance += deltaAmount;
    }
  }

  // --- PAYMENT METHODS ---
  recordPayment(pay: Omit<PaymentRecord, 'id'>): PaymentRecord {
    const id = `PAY-${String(this.payments.length + 1).padStart(3, '0')}`;
    const record: PaymentRecord = { id, ...pay };
    this.payments.push(record);

    // Adjust balance: RECEIVED reduces receivable balance
    const delta = pay.type === 'RECEIVED' ? -pay.amount : pay.amount;
    this.updatePartyBalance(pay.partyName, delta);

    return record;
  }

  getPayments(partyName?: string): PaymentRecord[] {
    if (!partyName) return this.payments;
    const p = partyName.toLowerCase();
    return this.payments.filter(pay => pay.partyName.toLowerCase().includes(p));
  }

  // --- CREDIT / DEBIT NOTE METHODS ---
  addNote(note: Omit<NoteRecord, 'id'>): NoteRecord {
    const id = `NTE-${String(this.notes.length + 1).padStart(3, '0')}`;
    const record: NoteRecord = { id, ...note };
    this.notes.push(record);

    // Credit Note reduces receivable balance, Debit Note increases it
    const delta = note.type === 'CREDIT' ? -note.totalAmount : note.totalAmount;
    this.updatePartyBalance(note.partyName, delta);

    return record;
  }

  getNotes(type?: 'CREDIT' | 'DEBIT'): NoteRecord[] {
    if (!type) return this.notes;
    return this.notes.filter(n => n.type === type);
  }

  // --- BANKING METHODS ---
  addBankAccount(acc: Omit<BankAccountRecord, 'id'>): BankAccountRecord {
    const id = `BNK-${String(this.bankAccounts.length + 1).padStart(3, '0')}`;
    const record: BankAccountRecord = { id, ...acc };
    this.bankAccounts.push(record);
    return record;
  }

  getBankAccounts(): BankAccountRecord[] {
    return this.bankAccounts;
  }

  recordCheque(chq: Omit<ChequeRecord, 'id'>): ChequeRecord {
    const id = `CHQ-${String(this.cheques.length + 1).padStart(3, '0')}`;
    const record: ChequeRecord = { id, ...chq };
    this.cheques.push(record);
    return record;
  }

  getCheques(): ChequeRecord[] {
    return this.cheques;
  }
}

export const erpStore = new ERPStore();
