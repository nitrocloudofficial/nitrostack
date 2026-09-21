export interface IdentityRecord {
  employeeName: string;
  role: string;
  accessGranted: boolean;
  systems: string[];
  updatedAt: string;
}

export class IdentityStore {
  private records = new Map<string, IdentityRecord>();

  grant(employeeName: string, role: string): IdentityRecord {
    const systems = this.getDefaultSystems(role);
    const record: IdentityRecord = {
      employeeName,
      role,
      accessGranted: true,
      systems,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(employeeName, record);
    return record;
  }

  revoke(employeeName: string): IdentityRecord | null {
    const record = this.records.get(employeeName);
    if (!record) return null;
    record.accessGranted = false;
    record.systems = [];
    record.updatedAt = new Date().toISOString();
    return record;
  }

  getStatus(employeeName: string): IdentityRecord | null {
    return this.records.get(employeeName) || null;
  }

  private getDefaultSystems(role: string): string[] {
    if (role.toLowerCase().includes('engineer')) {
      return ['SSO', 'VPN', 'CodeHost', 'GitHub'];
    }
    return ['SSO', 'Email'];
  }
}
