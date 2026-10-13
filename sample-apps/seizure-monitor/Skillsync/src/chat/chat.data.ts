export interface ConnectionRequest {
  id: string;
  fromStudentId: string;
  toStudentId: string;
  status: "Pending" | "Accepted" | "Rejected";
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  timestamp: Date;
}

export interface ChatRoom {
  id: string;
  student1Id: string;
  student2Id: string;
  createdAt: Date;
  messages: ChatMessage[];
}

/**
 * In-memory storage
 */

export const connectionRequests: ConnectionRequest[] = [];

export const chatRooms: ChatRoom[] = [];