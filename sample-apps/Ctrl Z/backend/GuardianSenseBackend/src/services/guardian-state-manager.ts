export interface GuardianState {
  backendOnline: boolean;
  monitoringActive: boolean;
  connectedDevices: number;
  activeSessions: number;
}

export class GuardianStateManager {
  private state: GuardianState = {
    backendOnline: true,
    monitoringActive: false,
    connectedDevices: 0,
    activeSessions: 0,
  };

  getState(): GuardianState {
    return this.state;
  }

  updateState(update: Partial<GuardianState>) {
    this.state = {
      ...this.state,
      ...update,
    };
  }

  reset() {
    this.state = {
      backendOnline: true,
      monitoringActive: false,
      connectedDevices: 0,
      activeSessions: 0,
    };
  }
}