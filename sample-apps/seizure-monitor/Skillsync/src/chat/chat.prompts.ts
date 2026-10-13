import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

export class ChatPrompts {

  @Prompt({
    name: "peer_chat_help",
    description: "Explain how students can connect and chat.",
  })
  async chatHelp(ctx: ExecutionContext) {

    ctx.logger.info("Chat help prompt requested");

    return {
      description: "SkillSync AI Chat Guide",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `
Welcome to SkillSync AI Chat!

Workflow:

1. Find a peer using

find_peer_matches

2. Send a request using

send_connection_request

3. Wait until the other student accepts.

4. Once accepted, a private chat room is created.

5. Use

send_message

to communicate.

6. Use

get_chat_history

to retrieve previous messages.
`,
          },
        },
      ],
    };
  }

}