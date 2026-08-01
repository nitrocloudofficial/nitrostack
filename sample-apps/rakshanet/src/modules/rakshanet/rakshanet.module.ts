import { Module } from '@nitrostack/core';
import { RakshaNetService } from './rakshanet.service.js';
import { RakshaNetTools } from './rakshanet.tools.js';
import { RakshaNetTaskTools } from './rakshanet.tasks.js';

import { ThreatService } from './services/threat.service.js';
import { DecisionService } from './services/decision.service.js';
import { LocationService } from './services/location.service.js';
import { CommunicationService } from './services/communication.service.js';

@Module({
    name: 'rakshanet',
    description: 'AI-powered women safety module',
    controllers: [
        RakshaNetTools,
        RakshaNetTaskTools,
    ],
    providers: [
        ThreatService,
        DecisionService,
        LocationService,
        CommunicationService,
        RakshaNetService,
    ],
})
export class RakshaNetModule {}