import { ApiGuardConfig } from '../src/modules/apiguard/config.service.js';
import { RepositoryScopeRepository } from '../src/modules/apiguard/repository-scope.repository.js';
import { RepositoryScopeService } from '../src/modules/apiguard/repository-scope.service.js';

async function main() {
  const cfg = new ApiGuardConfig();
  const repo = new RepositoryScopeRepository(cfg);
  const svc = new RepositoryScopeService(cfg, repo);

  console.log('Scope before bootstrap:', repo.getScope());
  await svc.bootstrapIfEmpty();
  console.log('Scope after bootstrap:', repo.getScope());
}

main().catch(console.error);
