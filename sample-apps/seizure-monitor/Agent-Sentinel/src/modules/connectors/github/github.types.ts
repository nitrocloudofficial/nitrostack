export interface GitHubRepository {

  name: string;

  privateRepo: boolean;

  workflows: number;

  openAlerts: number;

  exposedSecrets: number;

}