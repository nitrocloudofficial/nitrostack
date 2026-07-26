"use client";

import { useEffect, useRef } from "react";

// Phase 3: the old `stepSize` field was already dead (the shader's adaptive
// RK4 step is computed internally, not read from uniforms), so we repurpose
// that slot for `cameraAzimuth` and add ONE new field, `cameraElevation`,
// for the drag-orbit camera. Net change: +1 float (8 -> 9), buffer 32 -> 36
// bytes. `time` and the two camera angles are now driven by this component
// internally (drag state + a clock), not passed in from page.tsx, so they're
// no longer part of the external prop type.
export interface Uniforms {
  mass: number;
  cameraDistance: number;
  eventHorizonRadius: number;
  photonSphereRadius: number;
  resolutionX: number;
  resolutionY: number;
}

interface SpacetimeCanvasProps {
  uniforms: Uniforms;
}

// mass, cameraDistance, cameraAzimuth, cameraElevation, eventHorizonRadius,
// photonSphereRadius, resolutionX, resolutionY, time
const UNIFORM_FLOAT_COUNT = 9;
const UNIFORM_BUFFER_SIZE = UNIFORM_FLOAT_COUNT * 4; // bytes

const MIN_ELEVATION = -1.5; // radians, clamped short of the poles to avoid
const MAX_ELEVATION = 1.5; // the up-vector degenerating in the shader
const DRAG_SENSITIVITY = 0.008;

export default function SpacetimeCanvas({ uniforms }: SpacetimeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uniformsRef = useRef(uniforms);
  const uniformBufferRef = useRef<GPUBuffer | null>(null);
  const deviceRef = useRef<GPUDevice | null>(null);
  const startTimeRef = useRef(performance.now());

  // Orbit-camera drag state (Phase 3). Azimuth wraps freely; elevation is
  // clamped away from the poles.
  const azimuthRef = useRef(0);
  const elevationRef = useRef(0.15);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Keep the latest uniforms in a ref so the render loop (set up once) can
  // read fresh slider values every frame without re-creating the pipeline.
  useEffect(() => {
    uniformsRef.current = uniforms;
  }, [uniforms]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;

    async function init() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (!("gpu" in navigator)) {
        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          ctx2d.fillStyle = "#000";
          ctx2d.fillRect(0, 0, canvas.width, canvas.height);
          ctx2d.fillStyle = "#ff6b6b";
          ctx2d.font = "16px monospace";
          ctx2d.fillText("WebGPU not available in this browser.", 20, 40);
        }
        return;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return;
      const device = await adapter.requestDevice();
      if (cancelled) return;
      deviceRef.current = device;

      const context = canvas.getContext("webgpu") as GPUCanvasContext;
      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: "opaque" });

      const shaderSource = await (await fetch("/shaders/spacetime.wgsl")).text();
      const shaderModule = device.createShaderModule({ code: shaderSource });

      const uniformBuffer = device.createBuffer({
        size: UNIFORM_BUFFER_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      uniformBufferRef.current = uniformBuffer;

      const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: { type: "uniform" },
          },
        ],
      });

      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      const pipeline = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        vertex: { module: shaderModule, entryPoint: "vs_main" },
        fragment: {
          module: shaderModule,
          entryPoint: "fs_main",
          targets: [{ format }],
        },
        primitive: { topology: "triangle-list" },
      });

      function onPointerDown(e: PointerEvent) {
        draggingRef.current = true;
        lastPointerRef.current = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
      }

      function onPointerMove(e: PointerEvent) {
        if (!draggingRef.current) return;
        const dx = e.clientX - lastPointerRef.current.x;
        const dy = e.clientY - lastPointerRef.current.y;
        lastPointerRef.current = { x: e.clientX, y: e.clientY };

        azimuthRef.current -= dx * DRAG_SENSITIVITY;
        elevationRef.current = Math.max(
          MIN_ELEVATION,
          Math.min(MAX_ELEVATION, elevationRef.current + dy * DRAG_SENSITIVITY)
        );
      }

      function onPointerUp(e: PointerEvent) {
        draggingRef.current = false;
        canvas.style.cursor = "grab";
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      }

      canvas.style.cursor = "grab";
      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointerleave", onPointerUp);

      function resize() {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.floor(canvasEl.clientWidth * dpr));
        const height = Math.max(1, Math.floor(canvasEl.clientHeight * dpr));
        if (canvasEl.width !== width || canvasEl.height !== height) {
          canvasEl.width = width;
          canvasEl.height = height;
        }
      }

      function frame() {
        if (cancelled) return;
        resize();

        const current = uniformsRef.current;
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const data = new Float32Array([
          current.mass,
          current.cameraDistance,
          azimuthRef.current,
          elevationRef.current,
          current.eventHorizonRadius,
          current.photonSphereRadius,
          canvasRef.current?.width ?? current.resolutionX,
          canvasRef.current?.height ?? current.resolutionY,
          elapsed,
        ]);
        device.queue.writeBuffer(uniformBuffer, 0, data.buffer);

        const encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view,
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);

        rafId = requestAnimationFrame(frame);
      }

      rafId = requestAnimationFrame(frame);
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      uniformBufferRef.current?.destroy();
      // Pointer listeners are closures scoped to the canvas element created
      // in init(); React unmounts/replaces that element on cleanup, which
      // drops the listeners with it, so no explicit removeEventListener
      // calls are needed here.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}
