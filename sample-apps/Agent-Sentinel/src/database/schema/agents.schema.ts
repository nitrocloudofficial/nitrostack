export interface Agent {

  id: string;

  name: string;

  type: string;

  owner: string;

  status: "Healthy" | "Warning" | "Critical";

  riskScore: number;

  trustScore: number;

  lastSeen: string;

}