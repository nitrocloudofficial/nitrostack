/**
 * Sample Lab Reports for Testing
 * 
 * Realistic mock lab reports in various formats to test the parser.
 */

/**
 * Report 1: Well-formatted CBC (Complete Blood Count)
 * Standard format with proper spacing and units
 */
export const wellFormattedCBC = `
Hemoglobin : 13.5 g/dL
WBC : 7.2 K/uL
Platelet : 245 K/uL
`;

/**
 * Report 2: Mixed KFT + LFT with aliases
 * Uses common aliases (SGPT for ALT, Hb for Hemoglobin)
 * Includes some extra whitespace
 */
export const mixedKFTLFTWithAliases = `
Creatinine : 0.9 mg/dL
Urea : 18 mg/dL
SGPT : 42 U/L
Bilirubin : 0.8 mg/dL
Hb : 12.8 g/dL
`;

/**
 * Report 3: Comprehensive panel with typos and malformed lines
 * Tests robustness: includes unrecognized tests, missing units, etc.
 */
export const comprehensiveWithTypos = `
Hemoglobin : 14.2 g/dL
WBC : 6.8 K/uL
Platelet : 250 K/uL
Creatinine : 1.1 mg/dL
Urea : 22 mg/dL
ALT : 38 U/L
Bilirubin : 0.9 mg/dL
LDL : 120 mg/dL
FastingGlucose : 95 mg/dL
TSH : 2.1 mIU/L
Random Note : This line should not parse
Hemoglobin 13.5 g/dL
`;

/**
 * Report 4: Minimal report with only critical tests
 */
export const minimalReport = `
Hemoglobin : 11.2 g/dL
Creatinine : 1.5 mg/dL
FastingGlucose : 145 mg/dL
`;

/**
 * Report 5: Lipid profile focus
 */
export const lipidProfile = `
LDL : 95 mg/dL
Hemoglobin : 13.0 g/dL
TSH : 1.8 mIU/L
`;

/**
 * All sample reports for iteration
 */
export const allSampleReports = [
  { name: 'wellFormattedCBC', text: wellFormattedCBC },
  { name: 'mixedKFTLFTWithAliases', text: mixedKFTLFTWithAliases },
  { name: 'comprehensiveWithTypos', text: comprehensiveWithTypos },
  { name: 'minimalReport', text: minimalReport },
  { name: 'lipidProfile', text: lipidProfile }
];
