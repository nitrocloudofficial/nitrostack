import { McpApp, Module, ConfigModule } from '@nitrostack/core';

import { InvestigationModule } from './modules/investigation/investigation.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { EntityModule } from './modules/entities/entities.module.js';
import { RelationshipModule } from './modules/relationship/relationships.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';


@McpApp({
    module: AppModule,
    server: {
        name: 'investigation-context-platform',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'investigation-context',
    description: 'Persistent Investigation Context Platform',

    imports: [
        ConfigModule.forRoot(),

        // Investigation platform modules
        InvestigationModule,
        EvidenceModule,
        EntityModule,
        RelationshipModule,
        NotesModule,
        TasksModule,
        SearchModule,
        ReportsModule,
    ],
})
export class AppModule {}
