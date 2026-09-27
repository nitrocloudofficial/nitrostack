import { Module } from '../../nitrostack.js';
import { MaterialsTools } from './materials.tools.js';

@Module({
  name: 'materials',
  description: 'Materials & Procurement — supplier info, material constraints, availability',
  controllers: [MaterialsTools],
})
export class MaterialsModule {}
