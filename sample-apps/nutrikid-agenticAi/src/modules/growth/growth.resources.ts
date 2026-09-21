import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class GrowthResources {
  /**
   * Resource 1: WHO Growth Benchmark Standard
   */
  @Resource({
    uri: 'growth://who-standards',
    name: 'WHO Pediatric Growth Percentiles & Z-Score Reference',
    description: 'World Health Organization (WHO) longitudinal child growth charts and median height/weight benchmarks.',
    mimeType: 'application/json'
  })
  async getWhoStandards(ctx: ExecutionContext) {
    ctx.logger.info('[growth://who-standards] Accessing WHO Growth Benchmark Resource');
    return {
      source: 'World Health Organization (WHO) Child Growth Standards',
      ageCoverage: '0 to 18 years',
      metrics: ['Height-for-Age', 'Weight-for-Age', 'BMI-for-Age', 'Weight-for-Height'],
      classifications: [
        { label: 'Severely Stunted', criteria: 'Height-for-Age Z-score < -3 SD (< 3rd percentile)' },
        { label: 'Stunted', criteria: 'Height-for-Age Z-score < -2 SD (< 15th percentile)' },
        { label: 'Wasted (Underweight)', criteria: 'BMI-for-Age Z-score < -2 SD (< 5th percentile)' },
        { label: 'Healthy Weight', criteria: '5th to 85th percentile (Z-score -2 to +1 SD)' },
        { label: 'Overweight', criteria: '85th to 97th percentile (Z-score +1 to +2 SD)' },
        { label: 'Obese', criteria: '> 97th percentile (Z-score > +2 SD)' }
      ]
    };
  }

  /**
   * Resource 2: Growth Velocity Benchmarks
   */
  @Resource({
    uri: 'growth://velocity-standards',
    name: 'Pediatric Height & Weight Velocity Standards',
    description: 'Annual height gain and weight gain velocity benchmarks by pediatric age group.',
    mimeType: 'application/json'
  })
  async getVelocityStandards(ctx: ExecutionContext) {
    ctx.logger.info('[growth://velocity-standards] Accessing Growth Velocity Resource');
    return {
      source: 'ICMR & WHO Growth Velocity Reference',
      velocityBenchmarks: [
        { ageGroup: '0-1 year', expectedHeightVelocity: '25.0 cm/year', expectedWeightGain: '6.0 kg/year' },
        { ageGroup: '1-2 years', expectedHeightVelocity: '12.0 cm/year', expectedWeightGain: '2.5 kg/year' },
        { ageGroup: '2-5 years', expectedHeightVelocity: '7.0 cm/year', expectedWeightGain: '2.0 kg/year' },
        { ageGroup: '5-10 years', expectedHeightVelocity: '5.5 cm/year', expectedWeightGain: '2.5 kg/year' },
        { ageGroup: '10-14 years (Puberty)', expectedHeightVelocity: '8.5 - 10.0 cm/year', expectedWeightGain: '4.5 kg/year' }
      ]
    };
  }
}
