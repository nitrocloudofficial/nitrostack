import { ChemistryController } from './chemistry/chemistry.controller.js';
import { ConstraintController } from './constraint/constraint.controller.js';
import { DockingController } from './docking/docking.controller.js';
import { EvidenceController } from './evidence/evidence.controller.js';
import { PredictionController } from './prediction/prediction.controller.js';
import { ReportController } from './report/report.controller.js';
import { StructureController } from './structure/structure.controller.js';

export const TOOL_GROUPS = [
  {
    name: 'Immunoinformatics Tools',
    controller: new PredictionController() as unknown as Record<string, unknown>,
  },
  {
    name: 'Evidence Tools',
    controller: new EvidenceController() as unknown as Record<string, unknown>,
  },
  {
    name: 'Constraint Tools',
    controller: new ConstraintController() as unknown as Record<string, unknown>,
  },
  {
    name: 'Structure Tools',
    controller: new StructureController() as unknown as Record<string, unknown>,
  },
  {
    name: 'Chemistry Tools',
    controller: new ChemistryController() as unknown as Record<string, unknown>,
  },
  {
    name: 'Docking Tools',
    controller: new DockingController() as unknown as Record<string, unknown>,
  },
  {
    name: 'Report / Export Tools',
    controller: new ReportController() as unknown as Record<string, unknown>,
  },
] as const;
