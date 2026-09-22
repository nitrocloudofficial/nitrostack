/**
 * Sample batch orchestration script executed inside Code Mode sandbox.
 * Demonstrates pipelining multiple micro-tools in a single atomic request.
 */
async function main() {
  console.log('Starting data pipeline execution...');

  // Step 1: Filter data
  const rawValues = [12, 45, 68, 89, 23, 91, 105, 34];
  const filterRes = await callTool('data_filter_records', { values: rawValues, min: 50 });
  console.log('Filtered values:', filterRes.filtered);

  // Step 2: Aggregate sum
  const sumRes = await callTool('data_aggregate_sum', { values: filterRes.filtered });
  console.log('Aggregated metrics:', sumRes);

  // Step 3: Format output
  const formatRes = await callTool('data_transform_format', { prefix: 'METRIC', values: filterRes.filtered });

  return {
    rawCount: rawValues.length,
    filteredCount: filterRes.filtered.length,
    totalSum: sumRes.sum,
    average: sumRes.avg,
    records: formatRes.formatted,
  };
}

main();
