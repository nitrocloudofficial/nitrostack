"""
calc_tensors.py

Computes the Christoffel symbols of the second kind (Gamma^a_{bc}) for the
Schwarzschild metric in standard (t, r, theta, phi) coordinates, using SymPy.

Usage:
    python calc_tensors.py --mass 1.0 [--json]

Output (JSON mode):
    {
      "mass": 1.0,
      "coords": ["t", "r", "theta", "phi"],
      "nonzero_christoffel": [
        {"upper": "t", "lower": ["t", "r"], "expr": "M/(r*(-2*M + r))", "value": 0.142857},
        ...
      ]
    }

This is a real tensor calculation (not a lookup table): it builds g_{ab},
inverts it symbolically, and evaluates the standard formula

    Gamma^a_{bc} = 1/2 g^{ad} ( d_b g_{dc} + d_c g_{db} - d_d g_{bc} )

then substitutes the numeric mass M and simplifies each nonzero component.
"""

import argparse
import json
import sys

import sympy as sp


def build_schwarzschild_metric():
    t, r, theta, phi, M = sp.symbols("t r theta phi M", real=True, positive=False)
    coords = [t, r, theta, phi]

    f = 1 - 2 * M / r
    g = sp.diag(-f, 1 / f, r**2, r**2 * sp.sin(theta) ** 2)

    return coords, g, M


def christoffel_symbols(coords, g):
    n = len(coords)
    g_inv = g.inv()

    Gamma = [[[0 for _ in range(n)] for _ in range(n)] for _ in range(n)]

    for a in range(n):
        for b in range(n):
            for c in range(n):
                total = 0
                for d in range(n):
                    total += g_inv[a, d] * (
                        sp.diff(g[d, c], coords[b])
                        + sp.diff(g[d, b], coords[c])
                        - sp.diff(g[b, c], coords[d])
                    )
                Gamma[a][b][c] = sp.simplify(total / 2)

    return Gamma


NAMES = ["t", "r", "theta", "phi"]


def main():
    parser = argparse.ArgumentParser(description="Compute Schwarzschild Christoffel symbols.")
    parser.add_argument("--mass", type=float, default=1.0, help="Geometric mass M (rs = 2M).")
    parser.add_argument("--r", type=float, default=None, help="Optional radius to evaluate at.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args()

    coords, g, M_sym = build_schwarzschild_metric()
    Gamma = christoffel_symbols(coords, g)

    r_sym = coords[1]
    results = []
    for a in range(4):
        for b in range(4):
            for c in range(b, 4):  # symmetric in lower indices, only need b<=c
                expr = Gamma[a][b][c]
                if expr == 0:
                    continue
                numeric_expr = expr.subs(M_sym, args.mass)
                entry = {
                    "upper": NAMES[a],
                    "lower": [NAMES[b], NAMES[c]],
                    "expr": str(sp.simplify(numeric_expr)),
                }
                if args.r is not None:
                    try:
                        val = complex(numeric_expr.subs(r_sym, args.r))
                        entry["value"] = val.real if abs(val.imag) < 1e-12 else [val.real, val.imag]
                    except (TypeError, ValueError):
                        entry["value"] = None
                results.append(entry)

    payload = {
        "mass": args.mass,
        "schwarzschild_radius": 2 * args.mass,
        "photon_sphere_radius": 3 * args.mass,
        "coords": NAMES,
        "evaluated_at_r": args.r,
        "nonzero_christoffel": results,
    }

    if args.json:
        json.dump(payload, sys.stdout, indent=2)
        print()
    else:
        print(f"Schwarzschild Christoffel symbols (M = {args.mass}, rs = {2*args.mass}):\n")
        for entry in results:
            b, c = entry["lower"]
            line = f"  Gamma^{entry['upper']}_{{{b}{c}}} = {entry['expr']}"
            if "value" in entry:
                line += f"   [at r={args.r}: {entry['value']}]"
            print(line)


if __name__ == "__main__":
    main()
