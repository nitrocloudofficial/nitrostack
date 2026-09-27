export type RepositoryStatus = 'ACTIVE' | 'INACTIVE';

export interface ManagedRepository {
  /** Deterministic ID: sha256-prefix of owner + '/' + name */
  id: string;
  owner: string;
  name: string;
  /** Resolved default branch from GitHub API at time of ADD */
  branch: string;
  /** HEAD commit SHA at time of ADD or last refresh */
  lastKnownCommitSha: string;
  status: RepositoryStatus;
  addedAt: string;
  addedBy: string;
  removedAt?: string;
  removalReason?: string;
}

export interface RepositoryScope {
  /** Increments on every ACTIVE/INACTIVE state change */
  version: number;
  updatedAt: string;
  repositories: ManagedRepository[];
}
