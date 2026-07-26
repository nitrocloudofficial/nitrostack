export enum ConnectorStatus {
  CONNECTED = "Connected",
  DISCONNECTED = "Disconnected",
  ERROR = "Error"
}

export enum ConnectorType {
  GMAIL = "Gmail",
  CALENDAR = "Calendar",
  GITHUB = "GitHub",
  DISCORD = "Discord"
}

export interface Connector {

  id: string;

  name: string;

  type: ConnectorType;

  status: ConnectorStatus;

  lastSync: string;

  health: number;

}