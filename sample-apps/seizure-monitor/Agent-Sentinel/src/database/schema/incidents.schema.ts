export interface Incident {

  id: string;

  title: string;

  severity: "Low" | "Medium" | "High" | "Critical";

  description: string;

  affectedAgent: string;

  timestamp: string;

  resolved: boolean;

}