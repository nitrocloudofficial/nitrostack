import {
  Injectable,
  ExecutionContext,
  ToolDecorator as Tool,
  z,
} from "@nitrostack/core";

import { ChatService } from "./chat.service.js";

@Injectable({
  deps: [ChatService],
})
export class ChatTools {
  constructor(
    private readonly chatService: ChatService,
  ) {}

  @Tool({
    name: "send_connection_request",
    description: "Send a connection request to another student.",
    inputSchema: z.object({
      fromStudentId: z.string(),
      toStudentId: z.string(),
    }),
  })
  async sendConnectionRequest(
    input: {
      fromStudentId: string;
      toStudentId: string;
    },
    ctx: ExecutionContext,
  ) {
    const request =
      this.chatService.sendConnectionRequest(
        input.fromStudentId,
        input.toStudentId,
      );

    ctx.logger.info("Connection Request Sent", {
      requestId: request.id,
    });

    return {
      success: true,
      request,
    };
  }

  @Tool({
    name: "accept_connection_request",
    description: "Accept a pending connection request.",
    inputSchema: z.object({
      requestId: z.string(),
    }),
  })
  async acceptConnectionRequest(
    input: {
      requestId: string;
    },
    ctx: ExecutionContext,
  ) {
    const room =
      this.chatService.acceptConnectionRequest(
        input.requestId,
      );

    ctx.logger.info("Connection Accepted", {
      roomId: room.id,
    });

    return {
      success: true,
      room,
    };
  }

  @Tool({
    name: "reject_connection_request",
    description: "Reject a pending connection request.",
    inputSchema: z.object({
      requestId: z.string(),
    }),
  })
  async rejectConnectionRequest(
    input: {
      requestId: string;
    },
    ctx: ExecutionContext,
  ) {
    const request =
      this.chatService.rejectConnectionRequest(
        input.requestId,
      );

    ctx.logger.info("Connection Rejected", {
      requestId: request.id,
    });

    return {
      success: true,
      request,
    };
  }

  @Tool({
    name: "list_connection_requests",
    description: "List all connection requests for a student.",
    inputSchema: z.object({
      studentId: z.string().optional(),
    }),
  })
  async listConnectionRequests(
    input: {
      studentId?: string;
    },
    ctx: ExecutionContext,
  ) {
    const requests =
      this.chatService.getRequests(
        input.studentId,
      );

    ctx.logger.info("Listing Requests", {
      total: requests.length,
    });

    return {
      totalRequests: requests.length,
      requests,
    };
  }

  @Tool({
    name: "send_message",
    description: "Send a message inside a chat room.",
    inputSchema: z.object({
      roomId: z.string(),
      senderId: z.string(),
      message: z.string(),
    }),
  })
  async sendMessage(
    input: {
      roomId: string;
      senderId: string;
      message: string;
    },
    ctx: ExecutionContext,
  ) {
    const message =
      this.chatService.sendMessage(
        input.roomId,
        input.senderId,
        input.message,
      );

    ctx.logger.info("Message Sent", {
      roomId: input.roomId,
    });

    return {
      success: true,
      message,
    };
  }

  @Tool({
    name: "get_chat_history",
    description: "Retrieve all messages from a chat room.",
    inputSchema: z.object({
      roomId: z.string(),
    }),
  })
  async getChatHistory(
    input: {
      roomId: string;
    },
    ctx: ExecutionContext,
  ) {
    const history =
      this.chatService.getChatHistory(
        input.roomId,
      );

    ctx.logger.info("Chat History Retrieved", {
      roomId: input.roomId,
    });

    return {
      totalMessages: history.length,
      history,
    };
  }

  @Tool({
    name: "list_chats",
    description: "List all chat rooms of a student.",
    inputSchema: z.object({
      studentId: z.string(),
    }),
  })
  async listChats(
    input: {
      studentId: string;
    },
    ctx: ExecutionContext,
  ) {
    const chats =
      this.chatService.listChats(
        input.studentId,
      );

    ctx.logger.info("Listing Chats", {
      total: chats.length,
    });

    return {
      totalChats: chats.length,
      chats,
    };
  }
}