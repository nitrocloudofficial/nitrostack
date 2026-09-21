import { Module } from '@nitrostack/core';
import { IdentityStore } from './identity.store.js';
import { IdentityTools } from './identity.tools.js';

@Module({
  name: 'identity',
  description: 'Identity and SSO/HR system for employee access management',
  providers: [IdentityStore],
  controllers: [IdentityTools],
})
export class IdentityModule {}
