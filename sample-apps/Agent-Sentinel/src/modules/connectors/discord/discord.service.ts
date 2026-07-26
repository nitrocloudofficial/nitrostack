import type { DiscordServer } from "./discord.types.js";

export class DiscordService {

  async getServer(): Promise<DiscordServer> {

    return {

      name: "AgentSentinel SOC",

      members: 126,

      online: 37,

      securityChannel: "#security-alerts"

    };

  }

}