import type { Uniforms } from "@/components/SpacetimeCanvas";

/**
 * Derives the 6-field Uniforms struct from the two slider inputs (mass,
 * cameraDistance). Mirrors what the MCP `patch_wgsl_uniforms` tool computes
 * server-side (rs = 2M, photon sphere = 1.5*rs = 3M) so the frontend and
 * physics engine never disagree about these constants.
 *
 * Camera orientation (azimuth/elevation, driven by mouse drag) and the
 * animation clock are owned internally by <SpacetimeCanvas> as of Phase 3,
 * so they aren't part of this derived struct.
 */
export function computeUniforms(
  mass: number,
  cameraDistance: number,
  resolutionX = 1280,
  resolutionY = 720
): Uniforms {
  const eventHorizonRadius = 2 * mass;
  const photonSphereRadius = 1.5 * eventHorizonRadius;

  return {
    mass,
    cameraDistance,
    eventHorizonRadius,
    photonSphereRadius,
    resolutionX,
    resolutionY,
  };
}
