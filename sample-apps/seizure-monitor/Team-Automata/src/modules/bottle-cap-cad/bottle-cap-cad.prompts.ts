import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * FillGeometryGuide Prompts
 * 
 * Guides users through the process of generating a fill/plug for a hole or cavity.
 * Provides examples and explains the required geometry parameters.
 */
export class FillGeometryGuidePrompts {
  @Prompt({
    name: 'fill-geometry-guide',
    description: 'Guide for generating a fill/plug for a hole or cavity using the fill tool',
  })
  async fillGuidePrompt(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `I need to generate a fill/plug for a hole or cavity. Can you help me?

Please provide the following information:

1. **Top Shape** (the opening of the hole):
   - Type: 'circle', 'rectangle', 'stadium', 'polygon', or 'freeform'
   - For circle: diameter (mm)
   - For rectangle: width, length, optional cornerRadius (mm)
   - For stadium: length, width (mm) - like a rounded rectangle
   - For polygon: list of [x, y] points (mm)
   - For freeform: list of [x, y] points tracing the boundary (at least 6 points)

2. **Hole Depth** (mm): How deep is the hole?

3. **Optional - Bottom Shape**: If the hole is tapered (different shape at the bottom), provide the bottom shape in the same format as the top shape.

4. **Optional - Tolerance Margin** (mm, default: -0.15): 
   - Negative values = undersized for friction fit (recommended)
   - Positive values = oversized for loose fit

5. **Optional - Fit Type** (default: 'press_fit'):
   - 'press_fit': tight fit
   - 'loose': loose fit

6. **Optional - Cap Style** (default: 'flush'):
   - 'flush': small cap on top so plug doesn't sink below surface
   - 'recessed': plug sits slightly below surface
   - 'none': no cap

7. **Optional - Confidence** (default: 'medium'):
   - 'high', 'medium', or 'low' - your confidence in the extracted geometry

Example for a circular hole:
{
  "topShape": { "type": "circle", "diameter": 10 },
  "holeDepth": 5,
  "toleranceMargin": -0.15,
  "fitType": "press_fit",
  "capStyle": "flush",
  "confidence": "high"
}

Once you provide these details, I'll generate the STL file for your plug.`,
        },
      },
    ];
  }
}
