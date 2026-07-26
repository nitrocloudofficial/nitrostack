"use client";

import { useMemo, useState } from "react";
import SpacetimeCanvas from "@/components/SpacetimeCanvas";
import { computeUniforms } from "@/lib/uniforms";

export default function Page() {
  const [mass, setMass] = useState(1.0);
  const [cameraDistance, setCameraDistance] = useState(15.0);

  const uniforms = useMemo(() => computeUniforms(mass, cameraDistance), [mass, cameraDistance]);

  return (
    <main className="w-full h-screen bg-black text-zinc-200 flex">
      <div className="relative flex-1">
        <SpacetimeCanvas uniforms={uniforms} />
      </div>

      <aside className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-950/80 p-5 flex flex-col gap-6">
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-zinc-100">MetricLab AI</h1>
          <p className="text-xs text-zinc-500 mt-1">Schwarzschild ray tracer — Phase 1 (real geodesics)</p>
        </div>

        <label className="flex flex-col gap-2 text-xs">
          <span className="flex justify-between">
            <span>Mass (M)</span>
            <span className="text-zinc-400">{mass.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.05}
            value={mass}
            onChange={(e) => setMass(parseFloat(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-2 text-xs">
          <span className="flex justify-between">
            <span>Camera distance</span>
            <span className="text-zinc-400">{cameraDistance.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={4}
            max={40}
            step={0.5}
            value={cameraDistance}
            onChange={(e) => setCameraDistance(parseFloat(e.target.value))}
          />
        </label>

        <dl className="text-xs text-zinc-500 grid grid-cols-2 gap-y-1">
          <dt>rs (event horizon)</dt>
          <dd className="text-zinc-300">{uniforms.eventHorizonRadius.toFixed(2)}</dd>
          <dt>Photon sphere</dt>
          <dd className="text-zinc-300">{uniforms.photonSphereRadius.toFixed(2)}</dd>
        </dl>
      </aside>
    </main>
  );
}
