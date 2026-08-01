import { ToolDecorator as Tool, Widget, Injectable, z, ExecutionContext } from '@nitrostack/core';
import { MapsService } from '../tools/maps/maps.service.js';
import { PlacesService } from '../tools/places/places.service.js';
import { DemographicsService } from '../tools/demographics/demographics.service.js';
import { TrafficService } from '../tools/traffic/traffic.service.js';
import { OpportunityEngineService } from '../opportunity/opportunity-engine.service.js';

const AnalyzeInputSchema = z.object({
  businessType: z.string().describe("Type of business, e.g., 'Coffee Shop'"),
  city: z.string().describe("City to analyze, e.g., 'Coimbatore'"),
  budget: z.number().describe('Investment budget for the business'),
  radius: z.number().describe('Search radius in kilometers'),
});

/** Scores for a single evaluated zone. Mirrors ZoneScore in common/types.ts. */
const ZoneScoreSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  opportunityScore: z.number(),
  footfallPotentialScore: z.number(),
  demographicScore: z.number(),
  competitionScore: z.number(),
  anchorScore: z.number(),
  population: z.number().nullable(),
  competitorCount: z.number(),
  costPressureIndex: z.number(),
  budgetFitScore: z.number(),
});

const AnalyzeOutputSchema = z.object({
  opportunityScore: z.number(),
  recommendedArea: z.string(),
  // Named "traffic" for backwards compatibility; the value is the Footfall
  // Potential Score, not measured vehicle or pedestrian traffic.
  traffic: z.number(),
  competition: z.number(),
  demographics: z.number(),
  executiveSummary: z.string(),
  zones: z.array(ZoneScoreSchema).describe('Every evaluated zone, best first'),
  budgetAssumption: z
    .string()
    .describe('States the budget assumption applied, and that it is not measured rent data'),
  dataAvailabilityNote: z
    .string()
    .nullable()
    .describe('Set when a data source was unavailable and its weight was redistributed'),
});

/**
 * Planner
 *
 * Orchestrates the four independent tools (Maps, Places, Demographics,
 * Traffic) and hands their outputs to the Opportunity Engine. Contains no
 * scoring logic and no mock data of its own — both live in their own
 * modules, so this file never needs to change when a tool is swapped for
 * a real API.
 */
@Injectable({
  deps: [
    MapsService,
    PlacesService,
    DemographicsService,
    TrafficService,
    OpportunityEngineService,
  ],
})
export class PlannerTools {
  constructor(
    private readonly mapsService: MapsService,
    private readonly placesService: PlacesService,
    private readonly demographicsService: DemographicsService,
    private readonly trafficService: TrafficService,
    private readonly opportunityEngine: OpportunityEngineService
  ) {}

  @Tool({
    name: 'analyze',
    description:
      'Analyze retail opportunity for a business type, city, budget, and search radius. Returns an opportunity score, recommended area, and executive summary.',
    inputSchema: AnalyzeInputSchema,
    outputSchema: AnalyzeOutputSchema,
  })
  // Renders the RetailMind dashboard (heatmap, zone cards, report) in place of
  // raw JSON in MCP hosts that support widgets. The route maps to the Next.js
  // /analysis page, bundled by the CLI into src/widgets/out/analysis.html.
  // Route is deliberately bare, with no leading slash: it is resolved with
  // path.resolve(widgetsDir, 'out', route), and a leading slash would be
  // treated as an absolute path and escape the project directory.
  @Widget({ route: 'analysis', prefersBorder: true })
  async analyze(input: z.infer<typeof AnalyzeInputSchema>, ctx: ExecutionContext) {
    // TEMPORARY DIAGNOSTICS (stage tracing).
    // Deliberately uses ctx.logger, not console.error: only the framework
    // logger emits the NITRO_LOG:: lines that NitroStudio's Logs panel
    // renders, so console.error output is invisible there.
    const t0 = Date.now();
    const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    ctx.logger.info(`[analyze] START ${input.businessType} / ${input.city}`);

    ctx.logger.info(`[analyze] maps START (${elapsed()})`);
    const { zones } = await this.mapsService.findCandidateZones(input);
    ctx.logger.info(`[analyze] maps DONE — ${zones.length} zones (${elapsed()})`);

    // Each zone is fetched independently. A transient upstream failure on one
    // zone shouldn't discard the whole analysis, so failed zones are dropped
    // (and logged) rather than rejecting everything — we still only ever
    // report real data, just for the zones that resolved successfully.
    ctx.logger.info(`[analyze] zone-tools START (${elapsed()})`);
    const settled = await Promise.allSettled(
      zones.map(async (zone) => {
        ctx.logger.info(`[analyze] places START "${zone.name}" (${elapsed()})`);
        const placesPromise = this.placesService
          .getCompetitors(zone, input.businessType)
          .then((r) => {
            ctx.logger.info(`[analyze] places DONE "${zone.name}" (${elapsed()})`);
            return r;
          });

        ctx.logger.info(`[analyze] demographics START "${zone.name}" (${elapsed()})`);
        const demographicsPromise = this.demographicsService
          .getDemographics(zone)
          .then((r) => {
            ctx.logger.info(`[analyze] demographics DONE "${zone.name}" (${elapsed()})`);
            return r;
          });

        ctx.logger.info(`[analyze] traffic START "${zone.name}" (${elapsed()})`);
        const trafficPromise = this.trafficService.getTraffic(zone).then((r) => {
          ctx.logger.info(`[analyze] traffic DONE "${zone.name}" (${elapsed()})`);
          return r;
        });

        const [places, demographics, traffic] = await Promise.all([
          placesPromise,
          demographicsPromise,
          trafficPromise,
        ]);

        return { zone, places, demographics, traffic };
      })
    );
    ctx.logger.info(`[analyze] zone-tools DONE (${elapsed()})`);

    const zoneOutputs = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const failures = settled.flatMap((r) => (r.status === 'rejected' ? [r] : []));
    if (failures.length > 0) {
      ctx.logger.warn(
        `${failures.length}/${zones.length} zones failed and were skipped: ` +
          failures
            .map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
            .join(' | ')
      );
    }

    if (zoneOutputs.length === 0) {
      throw new Error(
        `Analysis failed for all ${zones.length} candidate zones. ` +
          `Last error: ${
            failures[0]?.reason instanceof Error
              ? failures[0].reason.message
              : String(failures[0]?.reason)
          }`
      );
    }

    ctx.logger.info(`[analyze] opportunity-engine START (${elapsed()})`);
    const result = this.opportunityEngine.evaluate(input, zoneOutputs);
    ctx.logger.info(`[analyze] opportunity-engine DONE (${elapsed()})`);
    ctx.logger.info(`[analyze] COMPLETE — total ${elapsed()}`);

    return result;
  }
}
