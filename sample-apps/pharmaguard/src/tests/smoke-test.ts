import { FdaTools } from '../tools/fda.tools.js';

const dummyContext: any = {};

async function runTests() {
  const tools = new FdaTools();
  console.log('--- Starting Smoke Tests ---');

  console.log('Testing lookup_ndc with "Ibuprofen"');
  const ndcResult = await tools.lookupNdc({ drugName: 'Ibuprofen' }, dummyContext);
  if (ndcResult.found === undefined) throw new Error('lookup_ndc failed validation');
  console.log('lookup_ndc passed');

  console.log('Testing search_adverse_events with "Aspirin"');
  const adverseResult = await tools.searchAdverseEvents({ drugName: 'Aspirin' }, dummyContext);
  if (adverseResult.found === undefined) throw new Error('search_adverse_events failed validation');
  console.log('search_adverse_events passed');

  console.log('Testing check_recall_status with "Tylenol"');
  const recallResult = await tools.checkRecallStatus({ drugName: 'Tylenol' }, dummyContext);
  if (recallResult.hasActiveRecalls === undefined && (recallResult as any).found === undefined) throw new Error('check_recall_status failed validation');
  console.log('check_recall_status passed');

  console.log('Testing compare_drugs with "Ibuprofen" and "Aspirin"');
  const compareResult = await tools.compareDrugs({ drugA: 'Ibuprofen', drugB: 'Aspirin' }, dummyContext);
  if ((compareResult as any).isComparison === undefined && (compareResult as any).found === undefined) throw new Error('compare_drugs failed validation');
  console.log('compare_drugs passed');

  console.log('--- All Smoke Tests Completed Successfully ---');
}

runTests().catch((err) => {
  console.error('Smoke tests failed:', err);
  process.exit(1);
});
