import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { NeuroTwinModule } from './modules/neurotwin/neurotwin.module.js';

/**
 * Root Application Module - NeuroTwin Evolver
 *
 * A self-evolving Industry 5.0 meta-agent. It doesn't just execute a fixed
 * RL policy - it detects environmental shifts its training never saw,
 * generates candidate logic mutations, simulates them in a digital twin,
 * and deploys the fittest one, across logistics, manufacturing, energy,
 * and safety as a single cross-domain optimization problem.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'neurotwin-evolver',
        version: '1.0.0',
    },
    logging: {
        level: 'info',
    },
})
@Module({
    name: 'neurotwin-evolver',
    description: 'NeuroTwin Evolver - self-coding industrial meta-agent',
    imports: [
        ConfigModule.forRoot(),
        NeuroTwinModule,
    ],
})
export class AppModule { }
