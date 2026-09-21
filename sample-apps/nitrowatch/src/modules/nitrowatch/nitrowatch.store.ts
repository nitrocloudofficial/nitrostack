export type ServerRecord = {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  registeredAt: string;
  capabilities?: unknown;
};

export type LogEntry = { ts: string; level: string; message: string };

export const SERVERS = new Map<string, ServerRecord>();
export const LOGS = new Map<string, LogEntry[]>();

export function addLog(serverId: string, level: string, message: string) {
  const list = LOGS.get(serverId) ?? [];
  list.push({ ts: new Date().toISOString(), level, message });
  LOGS.set(serverId, list);
}