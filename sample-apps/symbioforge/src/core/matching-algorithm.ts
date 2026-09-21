import { Factory, WasteStream, SymbioticMatch, MultiHopChain } from './types.js';
import { CompatibilityMatrix } from './compatibility-matrix.js';

export class MatchingAlgorithm {
  private compatibilityMatrix: CompatibilityMatrix;

  constructor() {
    this.compatibilityMatrix = new CompatibilityMatrix();
  }

  // Haversine formula to calculate distance in km
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return parseFloat(d.toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  public findMatches(factories: Factory[]): SymbioticMatch[] {
    const matches: SymbioticMatch[] = [];

    for (const source of factories) {
      if (!source.wasteStreams) continue;

      for (const waste of source.wasteStreams) {
        for (const target of factories) {
          if (source.id === target.id) continue;

          const comp = this.compatibilityMatrix.getCompatibility(waste, target);
          if (!comp) continue;

          const distance = this.calculateDistance(
            source.location.lat,
            source.location.lng,
            target.location.lat,
            target.location.lng
          );

          // Calculate proximity penalty (closer is better, max 50km for SIDCO cluster)
          const distanceScore = Math.max(0, 100 - distance * 4); // -4 points per km

          // Contamination penalty
          let contaminationPenalty = 0;
          if (waste.contamination === 'high') contaminationPenalty = 15;
          if (waste.contamination === 'hazardous') contaminationPenalty = 40;

          // Composite score
          const compositeScore = Math.round(
            comp.score * 0.5 + distanceScore * 0.4 + (100 - contaminationPenalty) * 0.1
          );

          if (compositeScore >= 50) {
            // Calculate volume in tons per year (assuming 300 operating days)
            const volumeTonsPerYear = parseFloat(((waste.volume * 300) / 1000).toFixed(2));

            // Rough CO2 saved: 1.2 tons CO2 saved per ton of waste diverted
            const co2SavedTonsPerYear = parseFloat((volumeTonsPerYear * 1.2).toFixed(2));

            // Rough savings: INR 5000 saved per ton of waste
            const savingsInrPerYear = Math.round(volumeTonsPerYear * 5000);

            matches.push({
              id: `match_${source.id}_${target.id}_${waste.name.toLowerCase().replace(/\s+/g, '_')}`,
              sourceFactoryId: source.id,
              sourceFactoryName: source.name,
              targetFactoryId: target.id,
              targetFactoryName: target.name,
              wasteStreamId: waste.id,
              wasteStreamName: waste.name,
              compatibilityScore: compositeScore,
              distanceKm: distance,
              volumeTonsPerYear,
              co2SavedTonsPerYear,
              savingsInrPerYear,
              status: 'New'
            });
          }
        }
      }
    }

    return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  public findMultiHopChains(matches: SymbioticMatch[]): MultiHopChain[] {
    const chains: MultiHopChain[] = [];
    const activeMatches = matches.filter(m => m.compatibilityScore >= 60);

    for (const match1 of activeMatches) {
      // Find a match where match1's target is the source, to form A -> B -> C
      const nextHops = activeMatches.filter(m => m.sourceFactoryId === match1.targetFactoryId && m.targetFactoryId !== match1.sourceFactoryId);

      for (const match2 of nextHops) {
        // Prevent simple cycles A -> B -> A, already covered in filter above
        
        const chainId = `chain_${match1.sourceFactoryId}_${match1.targetFactoryId}_${match2.targetFactoryId}`;
        
        // Basic score combining logic
        const overallScore = Math.round((match1.compatibilityScore + match2.compatibilityScore) / 2);
        
        if (overallScore >= 65) {
          chains.push({
            id: chainId,
            hops: [match1, match2],
            totalDistanceKm: parseFloat((match1.distanceKm + match2.distanceKm).toFixed(2)),
            totalCo2Saved: parseFloat((match1.co2SavedTonsPerYear + match2.co2SavedTonsPerYear).toFixed(2)),
            totalSavingsInr: match1.savingsInrPerYear + match2.savingsInrPerYear,
            overallCompatibilityScore: overallScore
          });
        }
      }
    }
    
    // Sort by best score
    return chains.sort((a, b) => b.overallCompatibilityScore - a.overallCompatibilityScore);
  }
}
