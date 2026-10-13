import { Module } from '@nitrostack/core';
import { SessionTools } from './session.tools.js';
import { UserModeService } from '../../services/user-mode.service.js';

/**
 * SessionModule
 *
 * Small, shared module (introduced in Phase 2) for the rider/driver mode
 * switch. Kept separate from RidesModule and DriverModule since the mode
 * toggle itself isn't specific to either — it's a thin cross-cutting
 * concern, following the same module/controller/provider pattern as the
 * rest of the app.
 */
@Module({
  name: 'session',
  description: 'Conversation mode switching (rider/driver)',
  controllers: [SessionTools],
  providers: [UserModeService],
})
export class SessionModule {}
