import { PolicyDefinition, DemoHospital } from './types.js';

export const DISCLAIMER = "Demo guidance only. This does not provide medical, legal, or insurance claim advice and does not determine claim eligibility.";

export const DEMO_POLICIES: Record<string, PolicyDefinition> = {
  'motor-basic': {
    type: 'Motor Basic',
    requiredDocuments: ['policy number', 'vehicle registration', 'driving licence', 'incident photos'],
    conditionalDocuments: [
      { condition: 'accident involves injury or major damage', documents: ['FIR'] }
    ]
  },
  'motor-premium': {
    type: 'Motor Premium',
    requiredDocuments: ['policy number', 'vehicle registration', 'driving licence', 'incident photos', 'repair estimate'],
    conditionalDocuments: [
      { condition: 'accident involves injury or major damage', documents: ['FIR'] }
    ]
  },
  'health-addon': {
    type: 'Health Add-on',
    requiredDocuments: ['policy number', 'identity proof'],
    conditionalDocuments: [
      { condition: 'hospital visit', documents: ['hospital bill or estimate'] },
      { condition: 'admitted', documents: ['discharge summary if available'] }
    ]
  }
};

export const DEMO_HOSPITALS: DemoHospital[] = [
  { name: 'Coimbatore City Hospital', isDemo: true, location: 'RS Puram' },
  { name: 'Kovai Medical Care', isDemo: true, location: 'Avinashi Road' },
  { name: 'Peelamedu General Hospital', isDemo: true, location: 'Peelamedu' },
  { name: 'Gandhipuram Health Center', isDemo: true, location: 'Gandhipuram' },
  { name: 'Vadavalli Polyclinic', isDemo: true, location: 'Vadavalli' },
  { name: 'Singanallur Emergency Care', isDemo: true, location: 'Singanallur' }
];

