import { Injectable } from '@nitrostack/core';

import { ThreatService } from './services/threat.service.js';
import { DecisionService } from './services/decision.service.js';

import { ThreatInput } from './dto/threat.dto.js';
import { LocationService } from './services/location.service.js';
import { CommunicationService } from './services/communication.service.js';

@Injectable({
    deps: [ThreatService, DecisionService, LocationService, CommunicationService],
})
export class RakshaNetService {
    constructor(
        private readonly threatService: ThreatService,
        private readonly decisionService: DecisionService,
        private readonly locationService: LocationService,
        private readonly communicationService: CommunicationService,
    ) {}

    async assessThreat(input: ThreatInput) {
    const threat = this.threatService.assessThreat(input);

    const decision = this.decisionService.decide(threat.level);

    const safeLocations = await this.locationService.findSafeLocations(
        input.latitude,
        input.longitude
    );

    const communication = await this.communicationService.executeEmergencyActions(
    {
        ...decision,
        risk: threat.risk,
        level: threat.level,
        latitude: input.latitude,
        longitude: input.longitude,
    },
    input.guardianPhone
);
    return {
        ...threat,
        decision,
        safeLocations,
        communication,
    };
}
}