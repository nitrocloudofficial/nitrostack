export interface WorkspaceRecord {
  employeeName: string;
  email: string | null;
  slackChannels: string[];
  driveAccess: boolean;
  status: 'active' | 'deprovisioned' | 'none';
  updatedAt: string;
}

export class WorkspaceStore {
  private records = new Map<string, WorkspaceRecord>();

  provision(employeeName: string, role: string): WorkspaceRecord {
    const email = `${employeeName.toLowerCase().replace(/\s+/g, '.')}@company.com`;
    const slackChannels = this.getDefaultChannels(role);
    const record: WorkspaceRecord = {
      employeeName,
      email,
      slackChannels,
      driveAccess: true,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    this.records.set(employeeName, record);
    return record;
  }

  deprovision(employeeName: string): WorkspaceRecord | null {
    const record = this.records.get(employeeName);
    if (!record) return null;
    record.email = null;
    record.slackChannels = [];
    record.driveAccess = false;
    record.status = 'deprovisioned';
    record.updatedAt = new Date().toISOString();
    return record;
  }

  getStatus(employeeName: string): WorkspaceRecord | null {
    return this.records.get(employeeName) || null;
  }

  private getDefaultChannels(role: string): string[] {
    const baseChannels = ['#general', '#announcements'];
    if (role.toLowerCase().includes('engineer')) {
      return [...baseChannels, '#engineering', '#code-review', '#devops'];
    }
    return baseChannels;
  }
}
