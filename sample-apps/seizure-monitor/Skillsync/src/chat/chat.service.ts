import { Injectable } from "@nitrostack/core";
import {
  ChatRoom,
  ChatMessage,
  ConnectionRequest,
  chatRooms,
  connectionRequests,
} from "./chat.data.js";

@Injectable()
export class ChatService {
  /**
   * Send a connection request
   */
  sendConnectionRequest(
    fromStudentId: string,
    toStudentId: string,
  ) {
    const request: ConnectionRequest = {
      id: crypto.randomUUID(),
      fromStudentId,
      toStudentId,
      status: "Pending",
      createdAt: new Date(),
    };

    connectionRequests.push(request);

    return request;
  }

  /**
   * Accept a request
   */
  acceptConnectionRequest(requestId: string) {
    const request = connectionRequests.find(
      (r) => r.id === requestId,
    );

    if (!request) {
      throw new Error("Connection request not found.");
    }

    request.status = "Accepted";

    const room: ChatRoom = {
      id: crypto.randomUUID(),
      student1Id: request.fromStudentId,
      student2Id: request.toStudentId,
      createdAt: new Date(),
      messages: [],
    };

    chatRooms.push(room);

    return room;
  }

  /**
   * Reject request
   */
  rejectConnectionRequest(requestId: string) {
    const request = connectionRequests.find(
      (r) => r.id === requestId,
    );

    if (!request) {
      throw new Error("Connection request not found.");
    }

    request.status = "Rejected";

    return request;
  }

  /**
   * List requests
   */
  getRequests(studentId?: string) {
    if (!studentId) {
      return connectionRequests;
    }

    return connectionRequests.filter(
      (r) =>
        r.fromStudentId === studentId ||
        r.toStudentId === studentId,
    );
  }

  /**
   * Send message
   */
  sendMessage(
    roomId: string,
    senderId: string,
    message: string,
  ) {
    const room = chatRooms.find(
      (r) => r.id === roomId,
    );

    if (!room) {
      throw new Error("Chat room not found.");
    }

    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId,
      message,
      timestamp: new Date(),
    };

    room.messages.push(chatMessage);

    return chatMessage;
  }

  /**
   * Chat history
   */
  getChatHistory(roomId: string) {
    const room = chatRooms.find(
      (r) => r.id === roomId,
    );

    if (!room) {
      throw new Error("Chat room not found.");
    }

    return room.messages;
  }

  /**
   * List chat rooms
   */
  listChats(studentId: string) {
    return chatRooms.filter(
      (room) =>
        room.student1Id === studentId ||
        room.student2Id === studentId,
    );
  }
}