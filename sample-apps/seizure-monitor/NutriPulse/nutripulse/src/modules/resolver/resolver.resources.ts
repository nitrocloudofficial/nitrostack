import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import path from 'path';
import fs from 'fs';

export class resolverResources {
  @Resource({
    uri: 'policy://clinical-rules',
    name: 'Clinical Rules Engine Policy',
    description: 'Read this to understand the deterministic logic used to evaluate dishes for safety warnings/blocks based on user biomarkers and conditions.',
    mimeType: 'application/json',
  })
  async getClinicalRules(context: ExecutionContext) {
    const rulesPath = path.resolve(process.cwd(), 'src', 'domain', 'clinical-rules.ts');
    const rawTs = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf-8') : '// Rules file missing';
    const stat = fs.existsSync(rulesPath) ? fs.statSync(rulesPath) : null;
    
    return {
      contents: [
        {
          uri: 'policy://clinical-rules',
          mimeType: 'text/typescript',
          text: rawTs
        },
        {
          uri: 'policy://clinical-rules',
          mimeType: 'application/json',
          text: JSON.stringify({ note: "See typescript text for logic" }, null, 2)
        }
      ],
      annotations: { audience: ['any'], priority: 1 },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }

  @Resource({
    uri: 'policy://reference-ranges',
    name: 'Lab Reference Ranges',
    description: 'Standard reference ranges for all supported lab analytes.',
    mimeType: 'application/json',
  })
  async getReferenceRanges(context: ExecutionContext) {
    const ranges = {
      "HbA1c": { unit: "%", low: 4.0, high: 5.6 },
      "Fasting Glucose": { unit: "mg/dL", low: 70, high: 99 },
      "Haemoglobin": { unit: "g/dL", low: 13.0, high: 17.0 },
      "Serum Ferritin": { unit: "ng/mL", low: 30, high: 400 },
      "Transferrin Saturation": { unit: "%", low: 20, high: 50 },
      "eGFR": { unit: "mL/min", low: 90, high: 140 },
      "25-OH Vitamin D": { unit: "ng/mL", low: 30, high: 100 },
      "INR": { unit: "", low: 0.8, high: 1.1 }, // Normal is 0.8-1.1, Therapeutic is 2.0-3.0
      "Creatinine": { unit: "mg/dL", low: 0.7, high: 1.2 },
      "Potassium": { unit: "mmol/L", low: 3.5, high: 5.1 },
      "Phosphorus": { unit: "mg/dL", low: 2.5, high: 4.5 },
      "LDL Cholesterol": { unit: "mg/dL", low: 0, high: 99 },
      "HDL Cholesterol": { unit: "mg/dL", low: 40, high: 60 },
      "Triglycerides": { unit: "mg/dL", low: 0, high: 149 }
    };

    return {
      contents: [{
        uri: 'policy://reference-ranges',
        mimeType: 'application/json',
        text: JSON.stringify(ranges, null, 2)
      }],
      annotations: { audience: ['any'], priority: 1 },
      lastModified: Date.now()
    };
  }
}

