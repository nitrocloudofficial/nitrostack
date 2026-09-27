import { v4 as uuid } from 'uuid';

export type Role = 'admin' | 'operator' | 'viewer' | 'agent';

export interface User {
  id: string;
  username: string;
  role: Role;
  apiKey: string;
  createdAt: Date;
  lastActive: Date;
  permissions: string[];
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  operator: ['chat', 'pipeline', 'agents', 'knowledge', 'decision', 'connectors', 'workflows'],
  viewer: ['chat', 'pipeline.status', 'knowledge.read', 'analytics.read'],
  agent: ['chat', 'pipeline', 'agents'],
};

export class AuthService {
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private apiKeys = new Map<string, string>();

  constructor() {
    this.createDefaultAdmin();
  }

  private createDefaultAdmin(): void {
    const adminKey = process.env.ADMIN_API_KEY || `aeios_admin_${uuid().slice(0, 8)}`;
    const admin: User = {
      id: uuid(),
      username: 'admin',
      role: 'admin',
      apiKey: adminKey,
      createdAt: new Date(),
      lastActive: new Date(),
      permissions: ROLE_PERMISSIONS.admin,
    };
    this.users.set(admin.id, admin);
    this.apiKeys.set(admin.apiKey, admin.id);
  }

  createUser(username: string, role: Role): User {
    const existing = Array.from(this.users.values()).find(u => u.username === username);
    if (existing) throw new Error(`User '${username}' already exists`);

    const user: User = {
      id: uuid(),
      username,
      role,
      apiKey: `aeios_${role}_${uuid().slice(0, 12)}`,
      createdAt: new Date(),
      lastActive: new Date(),
      permissions: ROLE_PERMISSIONS[role],
    };
    this.users.set(user.id, user);
    this.apiKeys.set(user.apiKey, user.id);
    return user;
  }

  authenticate(apiKey: string): User | null {
    const userId = this.apiKeys.get(apiKey);
    if (!userId) return null;
    const user = this.users.get(userId);
    if (user) user.lastActive = new Date();
    return user || null;
  }

  createSession(userId: string): Session {
    const session: Session = {
      id: uuid(),
      userId,
      token: `sess_${uuid()}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      active: true,
    };
    this.sessions.set(session.token, session);
    return session;
  }

  validateSession(token: string): Session | null {
    const session = this.sessions.get(token);
    if (!session || !session.active || new Date() > session.expiresAt) return null;
    return session;
  }

  hasPermission(user: User, permission: string): boolean {
    if (user.permissions.includes('*')) return true;
    return user.permissions.some(p => permission.startsWith(p));
  }

  revokeSession(token: string): boolean {
    const session = this.sessions.get(token);
    if (!session) return false;
    session.active = false;
    return true;
  }

  listUsers(): Omit<User, 'apiKey'>[] {
    return Array.from(this.users.values()).map(({ apiKey, ...rest }) => rest);
  }

  deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user || user.username === 'admin') return false;
    this.apiKeys.delete(user.apiKey);
    this.users.delete(userId);
    return true;
  }

  getStats() {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.active && new Date() < s.expiresAt);
    return {
      totalUsers: this.users.size,
      activeSessions: activeSessions.length,
      roles: Object.fromEntries(
        (['admin', 'operator', 'viewer', 'agent'] as Role[]).map(r => [
          r,
          Array.from(this.users.values()).filter(u => u.role === r).length,
        ])
      ),
    };
  }
}
