export interface GuardianDevice {
  id: string;
  name: string;
  online: boolean;
  lastSeen: Date;
}

export class DeviceRegistry {
  private devices = new Map<string, GuardianDevice>();

  registerDevice(id: string, name: string): GuardianDevice {
    const device: GuardianDevice = {
      id,
      name,
      online: true,
      lastSeen: new Date(),
    };

    this.devices.set(id, device);

    return device;
  }

  getDevice(id: string) {
    return this.devices.get(id);
  }

  getAllDevices() {
    return [...this.devices.values()];
  }

  updateHeartbeat(id: string) {
    const device = this.devices.get(id);

    if (!device) {
      return;
    }

    device.lastSeen = new Date();
    device.online = true;
  }

  markOffline(id: string) {
    const device = this.devices.get(id);

    if (!device) {
      return;
    }

    device.online = false;
  }
}