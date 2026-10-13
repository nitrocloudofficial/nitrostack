import { Module } from '@nitrostack/core';
import { HospitalService, RoutingService, TriageService, RankingService, ReservationService } from '../../server/services/index.js';
import { HospitalTools, RoutingTools, TriageTools, RankingTools, ReservationTools } from '../../server/tools/index.js';

@Module({
  name: 'lifeline',
  description: 'Emergency triage, hospital ranking, routing, and bed reservation',
  controllers: [HospitalTools, RoutingTools, TriageTools, RankingTools, ReservationTools],
  providers: [HospitalService, RoutingService, TriageService, RankingService, ReservationService],
})
export class LifelineModule {}
