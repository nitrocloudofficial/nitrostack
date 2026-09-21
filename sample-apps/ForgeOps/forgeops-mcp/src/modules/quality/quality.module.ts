import { Module } from '../../nitrostack.js';
import { QualityTools } from './quality.tools.js';

@Module({
  name: 'quality',
  description: 'Quality Management — defect records, inspection results, quality scoring',
  controllers: [QualityTools],
})
export class QualityModule {}
