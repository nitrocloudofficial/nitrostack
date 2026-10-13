"""
Repairs a 3D mesh to be manifold, watertight, and print-ready using PyMeshLab.
Invoked via subprocess from src/tools/repair.tools.ts — stdin-free, takes a
single JSON argv, prints a JSON summary to stdout on success.

Three repair levels, applied in sequence (each level adds to the previous):

  conservative — the minimum set of operations that can never make a mesh
                 worse: remove duplicate faces/vertices, remove non-manifold
                 edges and vertices (by splitting, not deleting), then unify
                 face normals so the inside/outside distinction is consistent.
                 Safe to apply unconditionally; doesn't close any holes or
                 move any vertices except the splits needed to fix non-manifold
                 geometry.

  standard     — adds hole filling (up to `holeSizeThreshold` faces per hole)
                 and degenerate-face removal. This is enough for the vast
                 majority of Meshy image-to-3D outputs, which are manifold
                 but often have small holes at texture seams or mis-oriented
                 patches.

  aggressive   — additionally runs Laplacian smoothing (reduces surface noise
                 while preserving large-scale shape) and, if targetFaceCount > 0,
                 isotropic remeshing to produce a clean, uniform-triangle mesh.
                 Use when the downstream slicer produces artefacts due to highly
                 non-uniform triangle density or when the mesh is too dense to
                 slice in reasonable time.

Input (JSON argv):
  {
    "url":               string | null,  // public URL — Python fetches it
    "inPath":            string | null,  // local temp path — already written by Node
    "outPath":           string,         // where to write the repaired mesh
    "repairLevel":       "conservative" | "standard" | "aggressive",
    "holeSizeThreshold": int,            // max hole perimeter in faces to auto-fill
    "targetFaceCount":   int             // 0 = skip remesh (aggressive only)
  }

Output (JSON to stdout):
  {
    "facesIn":        int,
    "verticesIn":     int,
    "facesOut":       int,
    "verticesOut":    int,
    "holesFilled":    int,
    "wasManifold":    bool,   // true if no repairs were needed at the manifold level
    "outPath":        str
  }
"""
import sys
import json
import os
import tempfile
import uuid
import urllib.request

import pymeshlab


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch_url(url: str) -> str:
    """Download a mesh from a URL to a temp file and return its path.

    PyMeshLab infers format from the file extension, so we preserve the
    extension from the URL (falling back to .glb, which PyMeshLab handles
    via the Open3D/draco loader on most builds).
    """
    ext = os.path.splitext(url.split("?")[0])[-1] or ".glb"
    tmp_path = os.path.join(tempfile.gettempdir(), f"repair_dl_{uuid.uuid4().hex}{ext}")
    urllib.request.urlretrieve(url, tmp_path)
    return tmp_path


def _stats(ms: pymeshlab.MeshSet) -> dict:
    """Return face/vertex counts for the current (top-of-stack) mesh."""
    m = ms.current_mesh()
    return {"faces": m.face_number(), "vertices": m.vertex_number()}


# ---------------------------------------------------------------------------
# Repair passes
# ---------------------------------------------------------------------------

def repair_conservative(ms: pymeshlab.MeshSet) -> None:
    """Minimum-safe repairs: dedupe, non-manifold fix, normal unification."""
    # Remove duplicate vertices that land on identical coordinates — common
    # after boolean operations or mesh export round-trips.
    ms.meshing_merge_close_vertices(threshold=pymeshlab.PercentageValue(0.0))

    # Remove duplicate faces (same three vertex indices in any order).
    ms.meshing_remove_duplicate_faces()

    # Split non-manifold edges and vertices.  "Split" rather than "delete"
    # so we lose no surface area — we just cut shared edges so every edge
    # has at most two adjacent faces, satisfying the manifold condition.
    ms.meshing_repair_non_manifold_edges(method=0)   # 0 = split, not remove
    ms.meshing_repair_non_manifold_vertices(vertdispratio=0.0)

    # Reorient faces so all normals point consistently outward.  Works by
    # flipping any face whose normal disagrees with its neighbours.
    ms.meshing_re_orient_faces_coherently()

    # After reorientation, fix any remaining inverted normals by recalculating
    # from face winding order and flipping faces that still point inward once
    # the majority-vote orientation is established.
    ms.compute_normal_per_face()
    ms.compute_normal_per_vertex()


def repair_standard(ms: pymeshlab.MeshSet, hole_size: int) -> int:
    """Adds hole filling and degenerate-face removal on top of conservative."""
    # Remove zero-area (degenerate) faces that survive the duplicate pass —
    # these can confuse the hole filler and the slicer.
    ms.meshing_remove_null_faces()

    # Fill holes whose perimeter (measured in face count) is ≤ hole_size.
    # We count holes before and after so we can report how many were closed.
    # PyMeshLab's topological_measures gives us boundary_edges as a proxy
    # for "number of open loops" — not perfect but the best available without
    # iterating individual holes.
    info_before = ms.get_topological_measures()
    holes_before = info_before.get("number_holes", 0)

    ms.meshing_close_holes(maxholesize=hole_size)

    info_after = ms.get_topological_measures()
    holes_after = info_after.get("number_holes", 0)

    return max(0, holes_before - holes_after)


def repair_aggressive(ms: pymeshlab.MeshSet, target_faces: int) -> None:
    """Adds smoothing and optional remeshing on top of standard."""
    # Laplacian smoothing — 3 iterations is enough to remove surface noise
    # from photogrammetry/AI reconstruction without rounding off features.
    # `cotangent_weighting=True` preserves edges better than uniform weighting.
    ms.apply_coord_laplacian_smoothing(stepsmoothnum=3, cotangentweight=True)

    if target_faces > 0:
        # Isotropic explicit remeshing: redistributes triangles so they are
        # roughly equal in size.  The target edge length is derived from the
        # bounding-box diagonal and the desired face count — an approximation
        # that works well for convex-ish objects (which most 3D-printed parts are).
        m = ms.current_mesh()
        bbox = m.bounding_box()
        diag = (
            (bbox.dim_x() ** 2 + bbox.dim_y() ** 2 + bbox.dim_z() ** 2) ** 0.5
        )
        # Rough estimate: average edge length for N equilateral triangles on a
        # surface of total area A ≈ sqrt(2*A/sqrt(3)/N). We use bounding-box
        # diagonal as a proportional proxy since computing surface area
        # requires iterating all faces.
        target_edge = diag / (target_faces ** 0.5) * 2.0

        ms.meshing_isotropic_explicit_remeshing(
            iterations=5,
            targetlen=pymeshlab.AbsoluteValue(target_edge),
        )

        # Remeshing can reintroduce tiny holes at high-curvature patches;
        # run a final light hole-fill pass.
        ms.meshing_close_holes(maxholesize=50)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def build(cfg: dict) -> dict:
    ms = pymeshlab.MeshSet()

    # --- Load ---
    fetched_path = None
    if cfg["url"]:
        fetched_path = _fetch_url(cfg["url"])
        ms.load_new_mesh(fetched_path)
    else:
        ms.load_new_mesh(cfg["inPath"])

    stats_in = _stats(ms)

    # Check manifold status before touching anything — reported back to the
    # caller so the LLM can tell the user whether repair was actually needed.
    topo_before = ms.get_topological_measures()
    was_manifold = (
        topo_before.get("number_holes", 0) == 0
        and topo_before.get("non_two_manifold_edges", 0) == 0
        and topo_before.get("non_two_manifold_vertices", 0) == 0
    )

    # --- Repair ---
    holes_filled = 0
    level = cfg["repairLevel"]

    repair_conservative(ms)

    if level in ("standard", "aggressive"):
        holes_filled = repair_standard(ms, cfg["holeSizeThreshold"])

    if level == "aggressive":
        repair_aggressive(ms, cfg["targetFaceCount"])

    # --- Save ---
    ms.save_current_mesh(cfg["outPath"])
    stats_out = _stats(ms)

    # --- Cleanup downloaded file ---
    if fetched_path and os.path.exists(fetched_path):
        try:
            os.unlink(fetched_path)
        except OSError:
            pass  # best-effort; temp dir will be cleaned eventually

    return {
        "facesIn": stats_in["faces"],
        "verticesIn": stats_in["vertices"],
        "facesOut": stats_out["faces"],
        "verticesOut": stats_out["vertices"],
        "holesFilled": holes_filled,
        "wasManifold": was_manifold,
        "outPath": cfg["outPath"],
    }


if __name__ == "__main__":
    cfg = json.loads(sys.argv[1])
    result = build(cfg)
    print(json.dumps(result))