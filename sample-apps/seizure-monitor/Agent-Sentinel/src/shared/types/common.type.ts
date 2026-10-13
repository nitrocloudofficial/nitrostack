export type Status =
  | "online"
  | "offline"
  | "healthy"
  | "warning"
  | "critical";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}