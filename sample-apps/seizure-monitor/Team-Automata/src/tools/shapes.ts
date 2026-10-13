import { z } from 'zod';
 
/**
 * A cross-section shape at some depth in a hole/cavity. Kept as explicit
 * tagged variants (circle/rectangle/polygon) rather than collapsing
 * everything to raw polygon coordinates — the open question flagged in
 * the design discussion. Explicit variants are easier for a vision model
 * to emit ("it's a rectangle, 20x30mm") than raw point clouds, at the
 * cost of a bit more branching in the CAD script.
 */
export const Shape = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('circle'),
    diameter: z.number().positive().describe('mm'),
  }),
  z.object({
    type: z.literal('rectangle'),
    width: z.number().positive().describe('mm'),
    length: z.number().positive().describe('mm'),
    cornerRadius: z.number().min(0).default(0).describe('mm, 0 = sharp corners'),
  }),
  z.object({
    type: z.literal('stadium'),
    width: z.number().positive().describe('mm, diameter across the semicircular ends'),
    length: z
      .number()
      .positive()
      .describe('mm, total end-to-end span including the rounded ends — must exceed width, otherwise use "circle"'),
  }).describe(
    'A true rounded-rectangle/slot shape with fully semicircular ends ' +
    '(unlike "rectangle" with cornerRadius, which stays a "squircle" no ' +
    'matter how large the radius gets). Use for oblong/slotted openings ' +
    'with genuinely rounded ends, e.g. a slot cut by a round tool.'
  ),
  z.object({
    type: z.literal('polygon'),
    points: z
      .array(z.tuple([z.number(), z.number()]))
      .min(3)
      .describe('mm, closed polygon vertices in order'),
  }),
  z.object({
    type: z.literal('freeform'),
    points: z
      .array(z.tuple([z.number(), z.number()]))
      .min(6)
      .max(300)
      .describe(
        'mm, ordered points traced along the boundary (do NOT repeat the ' +
        'first point at the end — the curve is closed automatically). ' +
        'These should come from tracing the actual contour of the opening ' +
        '(e.g. simplified from an OpenCV contour), not hand-picked corners.'
      ),
  }).describe(
    'For irregular/organic outlines with no describable geometric form — ' +
    'an amoeba-like blob, a worn or damaged hole, an organic cutout. Fits ' +
    'a smooth closed spline through the traced points, so the boundary ' +
    'curves continuously with no straight facets. This is NOT the same as ' +
    '"polygon", which connects points with straight edges and will look ' +
    'faceted on a curved outline unless given an impractically large ' +
    'number of points. Use polygon only for boundaries that genuinely ' +
    'have straight edges and sharp corners (e.g. a keyed slot); use ' +
    'freeform for anything with continuous curvature.'
  ),
]);
 
export type ShapeInput = z.infer<typeof Shape>;
