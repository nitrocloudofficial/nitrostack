export interface MonitorState {
  packetRate: number;
  rssi: number;
  activity: string;
  respiration: number;
  confidence: number;
}

let latestMonitorState: MonitorState = {
  packetRate: 0,
  rssi: 0,
  activity: "Waiting...",
  respiration: 0,
  confidence: 0,
};

export function updateMonitorState(state: MonitorState) {
  latestMonitorState = state;
}

export function getMonitorState() {
  return latestMonitorState;
}