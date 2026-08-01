export interface EquipmentRecord {
  employeeName: string;
  items: string[];
  status: 'assigned' | 'returned' | 'none';
  updatedAt: string;
}

export class EquipmentStore {
  private records = new Map<string, EquipmentRecord>();

  assign(employeeName: string, role: string): EquipmentRecord {
    const items = this.getDefaultEquipment(role);
    const record: EquipmentRecord = {
      employeeName,
      items,
      status: 'assigned',
      updatedAt: new Date().toISOString(),
    };
    this.records.set(employeeName, record);
    return record;
  }

  reclaim(employeeName: string): EquipmentRecord | null {
    const record = this.records.get(employeeName);
    if (!record) return null;
    record.items = [];
    record.status = 'returned';
    record.updatedAt = new Date().toISOString();
    return record;
  }

  getStatus(employeeName: string): EquipmentRecord | null {
    return this.records.get(employeeName) || null;
  }

  private getDefaultEquipment(role: string): string[] {
    if (role.toLowerCase().includes('engineer')) {
      return ['Laptop (MacBook Pro)', 'Monitor', 'Keyboard', 'Mouse', 'Headphones'];
    }
    return ['Laptop', 'Monitor'];
  }
}
