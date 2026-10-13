"""
Generates a solid plug that fills a measured hole/cavity — circular,
rectangular, capsule-shaped, an arbitrary straight-edged polygon, or a
freeform organic curve (e.g. amoeba-like blobs), uniform or tapered.
Invoked via subprocess from src/tools/fill.tools.ts.

Shape types, and when each applies:
  - circle / rectangle / stadium: named parametric shapes, cheapest and
    most robust when the opening genuinely matches one of them.
  - polygon: straight-edged, arbitrary vertex count — for shapes with
    real corners (e.g. a keyed slot), not curved boundaries.
  - freeform: fits a periodic (closed) spline through traced boundary
    points — for any irregular/organic outline that doesn't match a
    named shape or a straight-edged polygon. This is the general case;
    circle/rectangle/stadium exist only because they're common enough to
    warrant a cheaper, more robust special-case path.

Fixes applied vs. earlier drafts:
  - Rectangle corner fillets now run on the extruded solid's vertical
    edges (wp.rect(...).extrude(...).edges("|Z").fillet(rk)), not on the
    flat wire before extrusion, which CadQuery rejects.
  - Flush caps are implemented for circle/rectangle/stadium/freeform top
    shapes. A polygon top with capStyle="flush" is expected to already
    have been downgraded to "none" by the TS layer (fill.tools.ts), but
    this script also guards against it directly in case it's called
    standalone.
"""
import sys
import json
import os
import math
import tempfile
import uuid
import cadquery as cq

# Interpolating splines (wp.spline(..., periodic=True)) force the curve
# through every point exactly, which is what makes them precise — the
# curve genuinely passes through your traced boundary, not an approximation
# of it. Self-intersection at high point counts almost never comes from
# point count itself (cubic interpolation doesn't suffer classic Runge
# oscillation); it comes from a handful of near-duplicate or jittery
# points creating a literal tiny reversal in the path. So the fix is
# surgical dedup of pathologically-close points, not blanket resampling —
# resampling/smoothing would throw away real detail along with the noise,
# which is the opposite of what's wanted here.
_FREEFORM_MIN_POINT_SPACING = 0.05  # mm — points closer than this are merged
_STRAIGHT_ANGLE_THRESHOLD = math.radians(3)  # turning angle below this counts
# as "on a straight run" for the second, curvature-aware thinning pass
_STRAIGHT_RUN_THIN_FACTOR = 4.0  # how much more aggressively straight runs
# are thinned vs. curved ones
_OFFSET_SAFETY_FACTOR = 0.85  # keep an inward offset comfortably inside the
# tightest concave radius, since the discrete curvature estimate below is
# itself an approximation of the true (continuous) curve


def _dedupe_close_points(points: list, min_spacing: float) -> list:
    """Drop points that are closer than `min_spacing` to the previous kept
    point, walking the closed loop once. Removes literal duplicates and
    sub-noise jitter without smoothing or resampling anything else — every
    remaining point is exactly where it was traced."""
    if not points:
        return points
    kept = [points[0]]
    for x, y in points[1:]:
        lx, ly = kept[-1]
        if math.hypot(x - lx, y - ly) >= min_spacing:
            kept.append((x, y))
    # also check the wrap-around segment (last kept point back to the first)
    if len(kept) > 1:
        lx, ly = kept[-1]
        fx, fy = kept[0]
        if math.hypot(fx - lx, fy - ly) < min_spacing:
            kept.pop()
    return kept


def _orientation(a, b, c) -> int:
    val = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    if abs(val) < 1e-12:
        return 0
    return 1 if val > 0 else -1


def _on_segment(a, b, p) -> bool:
    return (
        min(a[0], b[0]) - 1e-9 <= p[0] <= max(a[0], b[0]) + 1e-9
        and min(a[1], b[1]) - 1e-9 <= p[1] <= max(a[1], b[1]) + 1e-9
    )


def _segments_intersect(p1, p2, p3, p4) -> bool:
    o1, o2 = _orientation(p1, p2, p3), _orientation(p1, p2, p4)
    o3, o4 = _orientation(p3, p4, p1), _orientation(p3, p4, p2)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and _on_segment(p1, p2, p3):
        return True
    if o2 == 0 and _on_segment(p1, p2, p4):
        return True
    if o3 == 0 and _on_segment(p3, p4, p1):
        return True
    if o4 == 0 and _on_segment(p3, p4, p2):
        return True
    return False


def _polyline_self_intersects(points: list) -> bool:
    """O(n^2) check for a self-crossing closed loop (n is capped at 300 by
    the schema, so worst case ~90k segment tests — negligible for a
    subprocess call). Catches the most common real-world input mistake:
    traced points that are jumbled or out of sequence rather than ordered
    continuously around the boundary."""
    n = len(points)
    if n < 4:
        return False
    segs = [(points[i], points[(i + 1) % n]) for i in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            if j == (i + 1) % n or i == (j + 1) % n:
                continue  # adjacent segments share an endpoint by construction
            if _segments_intersect(*segs[i], *segs[j]):
                return True
    return False


def _turning_angle(prev_pt, pt, next_pt) -> float:
    """Absolute turning angle (radians) the path makes at `pt` — 0 for
    dead-straight, larger for a sharper bend."""
    v1 = (pt[0] - prev_pt[0], pt[1] - prev_pt[1])
    v2 = (next_pt[0] - pt[0], next_pt[1] - pt[1])
    len1, len2 = math.hypot(*v1), math.hypot(*v2)
    if len1 < 1e-9 or len2 < 1e-9:
        return 0.0
    cos_a = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (len1 * len2)))
    return math.acos(cos_a)


def _simplify_straight_runs(points: list, base_spacing: float) -> list:
    """
    A second, curvature-aware thinning pass on top of `_dedupe_close_points`.
    Points sitting on a near-straight run of the traced contour add nothing
    to the fitted spline's shape (a spline through collinear points is just
    that line) but do add numerical noise — near-collinear points can make
    interpolating-spline fits and 2D offsets slightly unstable. Points on an
    actual curve are always left alone, since removing those is exactly the
    precision loss the freeform shape exists to avoid.
    """
    n = len(points)
    if n < 8:
        return points  # too few points to safely thin further
    kept = [points[0]]
    for i in range(1, n):
        prev_pt, pt, next_pt = points[i - 1], points[i], points[(i + 1) % n]
        angle = _turning_angle(prev_pt, pt, next_pt)
        threshold = base_spacing * (
            _STRAIGHT_RUN_THIN_FACTOR if angle < _STRAIGHT_ANGLE_THRESHOLD else 1.0
        )
        lx, ly = kept[-1]
        if math.hypot(pt[0] - lx, pt[1] - ly) >= threshold:
            kept.append(pt)
    if len(kept) > 1:
        lx, ly = kept[-1]
        fx, fy = kept[0]
        if math.hypot(fx - lx, fy - ly) < base_spacing:
            kept.pop()
    return kept if len(kept) >= 6 else points


def _circumradius(a, b, c):
    """Radius of the circle through three points — a local osculating-circle
    approximation of the curve's radius at `b`. None if ~collinear (radius
    effectively infinite, i.e. no local constraint)."""
    side_a = math.hypot(b[0] - c[0], b[1] - c[1])
    side_b = math.hypot(a[0] - c[0], a[1] - c[1])
    side_c = math.hypot(a[0] - b[0], a[1] - b[1])
    area2 = abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]))
    if area2 < 1e-9:
        return None
    return (side_a * side_b * side_c) / (2 * area2)


def _loop_signed_area(points: list) -> float:
    area = 0.0
    n = len(points)
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        area += x1 * y2 - x2 * y1
    return area / 2.0


def _min_concave_radius(points: list):
    """
    The tightest local osculating-circle radius among the loop's concave
    (reflex) vertices — the ones that limit how far the boundary can move
    *inward* before an offset curve self-intersects there. Convex vertices
    don't constrain an inward offset, so only concave ones are considered.
    None if there are no meaningfully concave vertices.
    """
    n = len(points)
    if n < 3:
        return None
    ccw = _loop_signed_area(points) > 0
    min_r = None
    for i in range(n):
        a, b, c = points[i - 1], points[i], points[(i + 1) % n]
        cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        is_concave = (cross < 0) if ccw else (cross > 0)
        if not is_concave:
            continue
        r = _circumradius(a, b, c)
        if r is not None and (min_r is None or r < min_r):
            min_r = r
    return min_r


def _clamp_inward_margin(margin: float, min_concave_radius):
    """Only inward (negative) offsets are constrained — growing the
    boundary outward never self-intersects at a concave vertex."""
    if margin >= 0 or min_concave_radius is None:
        return margin, None
    max_inward = min_concave_radius * _OFFSET_SAFETY_FACTOR
    if abs(margin) <= max_inward:
        return margin, None
    clamped = -max_inward
    warning = (
        f"Requested inward offset ({margin:.3f}mm) exceeds what the tightest "
        f"concave curve in the traced contour can support without "
        f"self-intersecting; clamped to {clamped:.3f}mm instead. The plug "
        "will be very slightly less undersized than requested in that area."
    )
    return clamped, warning


def _safe_offset(wire, margin: float):
    """Apply offset2D, retrying at a reduced magnitude if CadQuery rejects
    the result (typically a residual self-intersection the curvature
    estimate didn't fully catch). Returns (offset_wire, warning_or_None)."""
    attempt = margin
    warning = None
    for _ in range(4):
        try:
            return wire.offset2D(attempt), warning
        except Exception:
            attempt /= 2
            warning = (
                "2D offset of the freeform boundary failed at the requested "
                f"margin; retried at a reduced magnitude (now {attempt:.3f}mm) "
                "— check the result before printing, especially in tightly "
                "curved areas."
            )
    raise ValueError(
        "Could not produce a valid offset curve for the freeform boundary "
        "even after reducing the margin — the traced contour likely has a "
        "very tight concave feature. Try simplifying the contour there."
    )


def build_uniform_profile(shape: dict, margin: float, depth: float, warnings: list):
    """Build an extruded solid for a non-tapered (uniform) hole."""
    if shape["type"] == "circle":
        r = (shape["diameter"] + margin) / 2
        return cq.Workplane("XY").circle(r).extrude(-depth)

    if shape["type"] == "rectangle":
        w = shape["width"] + margin
        length = shape["length"] + margin
        rk = shape.get("cornerRadius", 0)
        solid = cq.Workplane("XY").rect(w, length).extrude(-depth)
        if rk > 0:
            solid = solid.edges("|Z").fillet(rk)
        return solid

    if shape["type"] == "polygon":
        pts = [(x + margin, y + margin) for x, y in shape["points"]]
        return cq.Workplane("XY").polyline(pts).close().extrude(-depth)

    if shape["type"] == "stadium":
        length = shape["length"] + margin
        width = shape["width"] + margin
        if length <= width:
            raise ValueError(
                f"stadium length ({length}) must exceed width ({width}); "
                "otherwise it's just a circle — use shape type 'circle' instead"
            )
        # slot2D's `length` is the total end-to-end span (rounded ends
        # included), `diameter` is the width across the semicircular ends.
        # Gives true 180° rounded ends — unlike rectangle+cornerRadius,
        # which stays a "squircle" no matter how large the radius gets.
        return cq.Workplane("XY").slot2D(length, width, 0).extrude(-depth)

    if shape["type"] == "freeform":
        return build_freeform_wire(cq.Workplane("XY"), shape["points"], margin, warnings).extrude(-depth)

    raise ValueError(f"unsupported shape type: {shape['type']}")


def build_freeform_wire(wp, points: list, margin: float, warnings: list = None):
    """
    Fit a smooth closed curve through arbitrary traced boundary points —
    for organic/irregular outlines (amoeba-like blobs, worn holes, damage)
    that don't match any named geometric shape. Uses a periodic spline so
    the boundary curves continuously with no straight facets, unlike
    'polygon' which connects the same points with straight edges and looks
    faceted on anything curved.

    Margin can't be applied per-point the way it is for circle/rectangle
    (adding to a diameter doesn't generalize to an arbitrary curve), so we
    build the raw traced curve first, then apply a true 2D curve offset —
    positive grows the boundary outward, negative (the usual tolerance
    case) shrinks it inward for a snugger friction fit. Any non-fatal
    issue handled along the way (a clamped margin, a retried offset) is
    appended to `warnings` rather than silently changing behavior or
    hard-failing.
    """
    if warnings is None:
        warnings = []
    if len(points) < 6:
        raise ValueError("freeform needs at least 6 traced points to fit a stable spline")

    if _polyline_self_intersects(points):
        raise ValueError(
            "The traced boundary points cross themselves (a self-intersecting "
            "contour) — check that they're ordered continuously around the "
            "outline (e.g. from a single-pass contour trace), not jumbled or "
            "out of sequence."
        )

    # Two thinning passes, both removing points only — never smoothing or
    # resampling, which would round off real curvature and corners along
    # with any noise. Pass 1 merges pathologically-close/duplicate points.
    # Pass 2 additionally thins near-straight runs (where extra density adds
    # numerical noise, not shape) while leaving genuinely curved stretches
    # untouched, preserving precision exactly where "amoeboid" detail lives.
    fit_points = _dedupe_close_points(points, _FREEFORM_MIN_POINT_SPACING)
    fit_points = _simplify_straight_runs(fit_points, _FREEFORM_MIN_POINT_SPACING)
    if len(fit_points) < 6:
        raise ValueError(
            "After removing near-duplicate points, fewer than 6 distinct "
            "points remain — the traced contour is too tightly clustered "
            "in places. Check for accidental duplicate points."
        )

    try:
        wire = wp.spline(fit_points, periodic=True)
    except Exception as exc:
        raise ValueError(
            "Failed to fit a smooth closed curve through the traced points — "
            "likely self-intersecting or too noisy. Try simplifying the "
            "contour (e.g. cv2.approxPolyDP with a larger epsilon) before "
            f"passing it in. Original error: {exc}"
        ) from exc

    if margin != 0:
        safe_margin, clamp_warning = _clamp_inward_margin(margin, _min_concave_radius(fit_points))
        if clamp_warning:
            warnings.append(clamp_warning)
        wire, offset_warning = _safe_offset(wire, safe_margin)
        if offset_warning:
            warnings.append(offset_warning)
    return wire


def build_wire_at_offset(shape: dict, margin: float, z_offset: float, warnings: list):
    """Build a profile wire at a given Z offset, for lofting between two shapes."""
    wp = cq.Workplane("XY").workplane(offset=z_offset)

    if shape["type"] == "circle":
        r = (shape["diameter"] + margin) / 2
        return wp.circle(r)

    if shape["type"] == "rectangle":
        w = shape["width"] + margin
        length = shape["length"] + margin
        # Note: corner fillets on loft profiles are applied at the wire
        # level here (approximation) rather than post-loft-solid, since
        # filleting loft edges directly is considerably more involved.
        rk = shape.get("cornerRadius", 0)
        rect = wp.rect(w, length)
        return rect.edges().fillet(rk) if rk > 0 else rect

    if shape["type"] == "polygon":
        pts = [(x + margin, y + margin) for x, y in shape["points"]]
        return wp.polyline(pts).close()

    if shape["type"] == "stadium":
        length = shape["length"] + margin
        width = shape["width"] + margin
        if length <= width:
            raise ValueError(
                f"stadium length ({length}) must exceed width ({width})"
            )
        return wp.slot2D(length, width, 0)

    if shape["type"] == "freeform":
        return build_freeform_wire(wp, shape["points"], margin, warnings)

    raise ValueError(f"unsupported shape type: {shape['type']}")


def build_flush_cap(top_shape: dict, warnings: list):
    """Small flush cap sitting on top so the plug doesn't sink below the surface."""
    cap_wp = cq.Workplane("XY")
    if top_shape["type"] == "circle":
        return cap_wp.circle(top_shape["diameter"] / 2 + 0.5).extrude(1.0)
    if top_shape["type"] == "rectangle":
        return cap_wp.rect(
            top_shape["width"] + 1.0, top_shape["length"] + 1.0
        ).extrude(1.0)
    if top_shape["type"] == "stadium":
        return cap_wp.slot2D(
            top_shape["length"] + 1.0, top_shape["width"] + 1.0, 0
        ).extrude(1.0)
    if top_shape["type"] == "freeform":
        # Grow the traced boundary outward by ~1mm for the lip, same idea
        # as the +1.0 used for the other shapes' flush caps.
        return build_freeform_wire(cap_wp, top_shape["points"], 2.0, warnings).extrude(1.0)
    # Polygon flush caps are a follow-up (needs an outward polygon offset,
    # e.g. via .offset2D()); the TS layer downgrades this to capStyle="none"
    # before it reaches here, but guard anyway.
    return None


def build(geo: dict) -> dict:
    # Defensive defaults mirroring src/tools/fill.tools.ts's zod schema —
    # belt-and-suspenders in case an omitted optional field ever reaches
    # this script without the TS layer having filled it in first.
    tolerance_raw = geo.get("toleranceMargin", -0.15)
    margin = float(tolerance_raw) if isinstance(tolerance_raw, str) else tolerance_raw
    depth_raw = geo["holeDepth"]  # required, no default — fail loudly if missing
    depth = float(depth_raw) if isinstance(depth_raw, str) else depth_raw
    cap_style = geo.get("capStyle", "flush")
    top = geo["topShape"]
    bottom = geo.get("bottomShape")

    # Collects non-fatal issues from the freeform path (a clamped margin, a
    # retried offset) so they reach the caller instead of being silent.
    warnings: list = []

    if bottom:
        top_wire = build_wire_at_offset(top, margin, 0, warnings)
        bottom_wire = build_wire_at_offset(bottom, margin, -depth, warnings)
        plug = top_wire.add(bottom_wire.val()).loft(ruled=True)
    else:
        plug = build_uniform_profile(top, margin, depth, warnings)

    if cap_style == "flush":
        cap = build_flush_cap(top, warnings)
        if cap is not None:
            plug = plug.union(cap)

    out_dir = tempfile.gettempdir()  # resolves correctly on Windows/macOS/Linux
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"fill_{uuid.uuid4().hex}.stl")
    cq.exporters.export(plug, out_path)
    return {"file": out_path, "warnings": warnings}


if __name__ == "__main__":
    geo = json.loads(sys.argv[1])
    print(json.dumps(build(geo)))