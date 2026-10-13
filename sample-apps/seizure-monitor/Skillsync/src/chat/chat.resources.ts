import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class ChatResources {

  @Resource({
    uri: "chat://guide",
    name: "SkillSync Chat Guide",
    description: "Guide to the peer chat system",
  })
  async guide(ctx: ExecutionContext) {

    ctx.logger.info("Loading chat guide");

    return {
      workflow: [
        "Find Peer Match",
        "Send Connection Request",
        "Accept Request",
        "Start Chat",
      ],
      tools: [
        "send_connection_request",
        "accept_connection_request",
        "reject_connection_request",
        "list_connection_requests",
        "send_message",
        "get_chat_history",
        "list_chats",
      ],
    };
  }

  @Resource({
    uri: "chat://statuses",
    name: "Connection Status",
    description: "Possible connection request statuses",
  })
  async statuses(ctx: ExecutionContext) {

    ctx.logger.info("Loading statuses");

    return {
      statuses: [
        "Pending",
        "Accepted",
        "Rejected",
      ],
    };
  }

}