"""
Generates a threaded cap STL from measured opening dimensions.
Invoked via subprocess from src/tools/cap.tools.ts — stdin-free, takes a
single JSON argv, prints the output file path to stdout.

Shape: a solid top disc (closed end) with a skirt hanging below it. The
skirt's inner wall carries one or more real helical thread ridges, cut
inward from a slightly-larger "root" wall down to the crest diameter the
caller specified as `innerDiameter` (i.e. innerDiameter is the diameter
the cap's threads must clear/engage, matching the original schema intent).

Threading approach: CadQuery has no built-in thread primitive, so each
thread start is built as a small trapezoidal tooth profile swept along a
cq.Wire.makeHelix() path (Frenet frame, so the tooth doesn't twist), then
unioned onto the skirt tube. Multi-start threads are the same helix
duplicated and rotated by 360/starts about the Z axis — rotating the
parametrized helix is equivalent to a fractional-pitch Z offset, which is
the standard construction for multi-start threads.
"""
import sys
import json
import os
import tempfile
import uuid
import cadquery as cq

# Used only when the caller omits threadPitch. Close to the PCO 1810
# standard (~3.18mm, single start) referenced in the tool's own schema
# comment — a reasonable single-start default, not a certified spec value.
# Override with an exact threadPitch whenever you have the real spec.
FALLBACK_THREAD_PITCH_MM = 3.18


def make_thread_solid(root_radius, thread_depth, pitch, run_height, z_start,
                       starts=1, base_half_width=None, tip_half_width=None,
                       embed=0.3):
    """
    Build one or more helical thread ridges as a single solid, meant to be
    unioned onto the inside of a skirt wall whose (unthreaded) inner
    surface sits at `root_radius`.

    Each tooth is a trapezoid in the (axial, radial) plane at the helix's
    start point: a wide base embedded `embed` mm outward into the wall
    (so the union is watertight) tapering inward over `thread_depth` mm to
    a small flat crest, rather than a knife-edge (sturdier to print and to
    engage/disengage repeatedly).
    """
    if base_half_width is None:
        base_half_width = pitch * 0.22
    if tip_half_width is None:
        tip_half_width = base_half_width * 0.25

    solids = []
    for i in range(starts):
        phase = 360.0 * i / starts
        helix = cq.Wire.makeHelix(
            pitch=pitch, height=run_height, radius=root_radius,
            center=(0, 0, z_start),
        )
        helix = helix.rotate((0, 0, 0), (0, 0, 1), phase)

        start_pt = helix.startPoint()
        tangent = helix.tangentAt(0)
        # xDir=(0,0,1) (global Z / axial) is used as a hint; cq.Plane
        # projects it perpendicular to the tangent, so yDir ends up
        # pointing radially outward at the start point. That gives the
        # profile's local (x, y) = (axial, radial) — exactly what the
        # tooth coordinates below assume.
        plane = cq.Plane(origin=start_pt, xDir=(0, 0, 1), normal=tangent)
        profile = (
            cq.Workplane(plane)
            .polyline([
                (-base_half_width, embed),
                (base_half_width, embed),
                (tip_half_width, -thread_depth),
                (-tip_half_width, -thread_depth),
            ])
            .close()
        )
        tooth = profile.sweep(helix, isFrenet=True)
        solids.append(tooth)

    result = solids[0]
    for s in solids[1:]:
        result = result.union(s)
    return result


def build(dims: dict) -> str:
    outer_r = dims["outerDiameter"] / 2
    bore_r = dims["innerDiameter"] / 2
    height = dims["height"]

    # Solid top wall thickness. No dedicated schema field for this yet, so
    # pick something proportionate to overall height (clamped to a
    # sensible printable range) unless the caller supplies one.
    top_thickness = dims.get("topThickness") or min(3.0, max(1.2, height * 0.25))
    if top_thickness >= height:
        raise ValueError(
            f"topThickness ({top_thickness}mm) must be less than height ({height}mm)"
        )
    skirt_height = height - top_thickness

    # Radial depth of the thread ridge, and the skirt's own (unthreaded)
    # inner wall radius, set so the thread crest reaches exactly bore_r —
    # i.e. innerDiameter keeps meaning "the diameter the cap must clear".
    thread_depth = dims.get("threadDepth") or 0.6
    root_r = bore_r + thread_depth
    if root_r >= outer_r:
        raise ValueError(
            "innerDiameter + 2*threadDepth must be less than outerDiameter "
            "(no room left for the skirt wall)"
        )

    thread_pitch = dims.get("threadPitch") or FALLBACK_THREAD_PITCH_MM
    thread_starts = dims.get("threadStarts") or 1

    # Small lead-in/lead-out margin at each end of the skirt so threads
    # never touch the open bottom edge or bleed into the solid top.
    margin = min(1.0, skirt_height * 0.15)
    run_height = max(skirt_height - 2 * margin, 0.0)

    # Main body: solid cylinder for the full height, then a blind bore cut
    # from the bottom up to skirt_height — this is what leaves a solid,
    # closed top disc instead of the through-hole the previous version cut.
    outer = cq.Workplane("XY").circle(outer_r).extrude(height)
    bore_cutter = cq.Workplane("XY").circle(root_r).extrude(skirt_height + 0.01)
    cap = outer.cut(bore_cutter)

    if run_height > thread_pitch * 0.25:
        thread = make_thread_solid(
            root_radius=root_r,
            thread_depth=thread_depth,
            pitch=thread_pitch,
            run_height=run_height,
            z_start=margin,
            starts=thread_starts,
        )
        # Belt-and-suspenders bound so a tooth's own end faces (which can
        # slightly overshoot the helix's nominal z-range) never poke past
        # the skirt cavity into the top disc or below the open bottom.
        bound = cq.Workplane("XY").circle(root_r + 1).extrude(skirt_height + 0.01)
        thread = thread.intersect(bound)
        cap = cap.union(thread)

    out_dir = tempfile.gettempdir()  # resolves correctly on Windows/macOS/Linux
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"cap_{uuid.uuid4().hex}.stl")
    cq.exporters.export(cap, out_path)
    return out_path


if __name__ == "__main__":
    dims = json.loads(sys.argv[1])
    print(build(dims))
