import { Module } from '@nitrostack/core';
import { NpmRegistryService } from './npm-registry.service.js';
import { OsvService } from './osv.service.js';
import { TarballService } from './tarball.service.js';

/** Read-only access to the npm registry, npm downloads API and OSV. */
@Module({
  name: 'registry',
  description: 'npm registry, downloads and OSV clients',
  providers: [NpmRegistryService, OsvService, TarballService],
  exports: [NpmRegistryService, OsvService, TarballService],
})
export class RegistryModule {}
