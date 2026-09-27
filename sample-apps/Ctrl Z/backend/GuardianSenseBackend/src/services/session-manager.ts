export interface GuardianSession {
  id: string;
  deviceId: string;
  startedAt: Date;
  monitoring: boolean;
}

export class SessionManager {
  private sessions = new Map<string, GuardianSession>();

  createSession(deviceId: string): GuardianSession {
    const session: GuardianSession = {
      id: crypto.randomUUID(),
      deviceId,
      startedAt: new Date(),
      monitoring: true,
    };

    this.sessions.set(session.id, session);

    return session;
  }

  getSession(id: string) {
    return this.sessions.get(id);
  }

  getAllSessions() {
    return [...this.sessions.values()];
  }

  stopSession(id: string) {
    const session = this.sessions.get(id);

    if (!session) {
      return false;
    }

    session.monitoring = false;

    return true;
  }
}