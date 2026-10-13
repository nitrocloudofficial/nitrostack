import { Module, ConfigService } from '@nitrostack/core';
import { 
  VISION_SERVICE, 
  AIRTABLE_SERVICE, 
  SLACK_SERVICE, 
  GMAIL_SERVICE, 
  TOMTOM_SERVICE 
} from './integrations.types.js';
import { 
  MockVisionService, 
  MockAirtableService, 
  MockSlackService, 
  MockGmailService, 
  MockTomTomService 
} from './mock-services.js';

@Module({
  name: 'integrations',
  description: 'Provides external MCP integrations (Mock or Real)',
  providers: [
    {
      provide: VISION_SERVICE,
      useClass: MockVisionService
    },
    {
      provide: AIRTABLE_SERVICE,
      useClass: MockAirtableService
    },
    {
      provide: SLACK_SERVICE,
      useClass: MockSlackService
    },
    {
      provide: GMAIL_SERVICE,
      useClass: MockGmailService
    },
    {
      provide: TOMTOM_SERVICE,
      useClass: MockTomTomService
    }
  ],
  exports: [
    VISION_SERVICE,
    AIRTABLE_SERVICE,
    SLACK_SERVICE,
    GMAIL_SERVICE,
    TOMTOM_SERVICE
  ]
})
export class IntegrationsModule {}
