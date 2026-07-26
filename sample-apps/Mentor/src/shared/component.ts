// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit here.
//
// The original is shared/component.ts at the monorepo root. Three deployed services
// need the same copy of the bridge contracts, and each deploys as a lone folder,
// so the file is duplicated and the duplication is guarded:
//
//   npm run sync:shared            regenerate every copy
//   npm run sync:shared -- --check fail if any copy has drifted (runs in verify)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The join key between a canvas label and a code component.
 *
 * Shared by all three apps because it is the seam every bridge crosses. MCP‑1
 * derives a checkpoint whose `subject` is the word the student typed into Lumina;
 * MCP‑2 receives a build event naming a component read out of a file path; MCP‑3
 * files a weak spot against it. Exact-string joins fail on "Tax" vs "tax" and the
 * bridge silently misses — so the normalisation is defined once, here, and the
 * three apps are guarded against drifting from it by `sync:shared --check`.
 *
 * Case, surrounding whitespace, and inner separators are not meaningful
 * differences between two names for the same box.
 */

export function normalizeComponent(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/** True when two names refer to the same component. */
export function sameComponent(a: string, b: string): boolean {
  return normalizeComponent(a) === normalizeComponent(b);
}
