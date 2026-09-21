import { GmailService } from "./gmail/gmail.service.js";
import { CalendarService } from "./calendar/calendar.service.js";
import { GitHubService } from "./github/github.service.js";
import { DiscordService } from "./discord/discord.service.js";

import {
  ConnectorStatus,
  ConnectorType,
  type Connector,
} from "./connectors.types.js";

export class ConnectorsEngine {

  private readonly gmail = new GmailService();
  private readonly calendar = new CalendarService();
  private readonly github = new GitHubService();
  private readonly discord = new DiscordService();

  async getConnectorSummary() {

    const gmail = await this.gmail.getAccount();
    const meetings = await this.calendar.getMeetings();
    const repositories = await this.github.getRepositories();
    const discord = await this.discord.getServer();

    return {

      gmail,

      meetings,

      repositories,

      discord

    };

  }

  async getConnectors(): Promise<Connector[]> {

    const now = new Date().toISOString();

    return [

      {
        id: "gmail",
        name: "Enterprise Gmail",
        type: ConnectorType.GMAIL,
        status: ConnectorStatus.CONNECTED,
        lastSync: now,
        health: 100
      },

      {
        id: "calendar",
        name: "Google Calendar",
        type: ConnectorType.CALENDAR,
        status: ConnectorStatus.CONNECTED,
        lastSync: now,
        health: 100
      },

      {
        id: "github",
        name: "GitHub",
        type: ConnectorType.GITHUB,
        status: ConnectorStatus.CONNECTED,
        lastSync: now,
        health: 98
      },

      {
        id: "discord",
        name: "Discord",
        type: ConnectorType.DISCORD,
        status: ConnectorStatus.CONNECTED,
        lastSync: now,
        health: 96
      }

    ];

  }

  async getOverallHealth(): Promise<number> {

    const connectors = await this.getConnectors();

    const total = connectors.reduce(
      (sum, connector) => sum + connector.health,
      0
    );

    return Math.round(total / connectors.length);

  }

}