import type { GitHubRepository } from "./github.types.js";

export class GitHubService {

  async getRepositories(): Promise<GitHubRepository[]> {

    try {

      // TODO:
      // Replace this mock data with GitHub REST API calls.
      // Example endpoints:
      // GET /user/repos
      // GET /repos/{owner}/{repo}/actions/workflows
      // GET /repos/{owner}/{repo}/code-scanning/alerts
      // GET /repos/{owner}/{repo}/secret-scanning/alerts

      const repositories: GitHubRepository[] = [

        {
          name: "Agent-Sentinel",
          privateRepo: true,
          workflows: 5,
          openAlerts: 2,
          exposedSecrets: 0,
        },

        {
          name: "Enterprise-AI-SOC",
          privateRepo: true,
          workflows: 8,
          openAlerts: 1,
          exposedSecrets: 0,
        },

        {
          name: "Internal-Tools",
          privateRepo: false,
          workflows: 3,
          openAlerts: 4,
          exposedSecrets: 1,
        },

      ];

      return repositories;

    } catch (error) {

      console.error("GitHub repository fetch failed:", error);

      return [];

    }

  }

}