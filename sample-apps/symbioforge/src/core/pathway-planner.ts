import { readFileSync } from 'fs';
import { join } from 'path';
import { SymbioticMatch, ProductConcept, Blueprint } from './types.js';

export class PathwayPlanner {
  private processes: any[] = [];

  constructor() {
    try {
      const procPath = join(process.cwd(), 'src/data/manufacturing-processes.json');
      const data = JSON.parse(readFileSync(procPath, 'utf-8'));
      this.processes = data.processes || [];
    } catch (e) {
      this.processes = [];
    }
  }

  public planMatchPathway(match: SymbioticMatch): Blueprint {
    return {
      id: match.id,
      opportunityId: match.id,
      opportunityType: 'match',
      title: `Symbiosis: ${match.wasteStreamName} from ${match.sourceFactoryName} to ${match.targetFactoryName}`,
      steps: [
        `Establish waste collection protocol at ${match.sourceFactoryName} (daily volume: ${(match.volumeTonsPerYear / 300 * 1000).toFixed(0)} kg).`,
        `Arrange transport logistics via local SIDCO carrier (route distance: ${match.distanceKm} km).`,
        `Implement receiving quality check at ${match.targetFactoryName} to verify contamination level is below threshold.`,
        `Pre-process material (cleaning, sorting, drying) at target facility.`,
        `Feed pre-processed ${match.wasteStreamName} directly into target production line as raw material substitute.`
      ],
      equipment: [
        { name: 'Sorting Bins', spec: 'Color-coded industrial bins, 500L', costInr: 15000 },
        { name: 'Moisture Analyzer', spec: 'Halogen heating, 0.01% readability', costInr: 45000 }
      ],
      facilityRequirements: {
        spaceSqFt: 100,
        powerKw: 5,
        waterLpd: 0,
        ventilation: 'Standard natural ventilation'
      },
      capexInr: 60000,
      paybackMonths: parseFloat((60000 / (match.savingsInrPerYear / 12)).toFixed(1)),
      timelineWeeks: 4,
      regulatoryNotes: [
        'Requires updating SPCB Consent to Operate (CTO) for both factories to reflect waste exchange.',
        'Ensure manifest system is maintained for hazardous waste transport if applicable.'
      ]
    };
  }

  public planProductPathway(product: ProductConcept): Blueprint {
    const proc = this.processes.find(p => p.name === product.manufacturingProcess) || {
      requiredEquipment: [],
      facilityRequirements: { spaceSqFt: 200, powerKw: 10, waterLpd: 100, ventilation: 'Standard' },
      capexInr: 500000,
      timelineWeeks: 8,
      regulatoryNotes: ['Requires standard SPCB clearances.']
    };

    const suppliersList = product.wasteStreamsUsed.map(w => `${w.wasteStreamName} from ${w.factoryName}`).join(' and ');

    return {
      id: product.id,
      opportunityId: product.id,
      opportunityType: 'product',
      title: `Manufacturing Blueprint: ${product.name} from ${product.wasteStreamsUsed.map(w => w.wasteStreamName).join(' + ')}`,
      steps: [
        `Source raw waste inputs: ${suppliersList}.`,
        `Transport materials to the centralized processing facility.`,
        `Execute pre-processing: shredding, grinding, and blending according to material specifications.`,
        `Apply ${product.manufacturingProcess} process to mold/extrude the composite mixture.`,
        `Cool, trim, and perform quality control checks (density, flexural strength, and dimensional accuracy).`,
        `Package and distribute finished ${product.name} to target market: ${product.targetMarket}.`
      ],
      equipment: proc.requiredEquipment,
      facilityRequirements: proc.facilityRequirements,
      capexInr: proc.capexInr,
      paybackMonths: parseFloat((proc.capexInr / (product.revenuePotentialInrPerYear / 12)).toFixed(1)),
      timelineWeeks: proc.timelineWeeks,
      regulatoryNotes: proc.regulatoryNotes
    };
  }
}
