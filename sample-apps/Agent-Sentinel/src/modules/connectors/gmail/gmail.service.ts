import type { GmailAccount } from "./gmail.types.js";

export class GmailService {

  async getAccount(): Promise<GmailAccount> {

    return {

      email: "security@agentsentinel.ai",

      unread: 14,

      suspiciousEmails: 2,

      aiNotifications: 8,

      lastSync: new Date().toISOString()

    };

  }

}