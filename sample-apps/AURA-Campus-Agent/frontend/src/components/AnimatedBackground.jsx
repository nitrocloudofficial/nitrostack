import React, { useEffect, useRef } from 'react';

/**
 * AnimatedBackground
 * Renders a full-screen canvas with a soft light blue & pinkish mixed gradient:
 *  - High-radius slow-breathing colorful blobs that blend together (periwinkle, sky blue, rose pink, lavender)
 *  - Floating soft pastel connection particles with low visibility
 *  - Proximity mouse effect
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let animId;

    // Soft pastel color palette for particles
    const COLORS = [
      { r:244, g:143, b:177 },  // soft pink
      { r:14,  g:165, b:233 },  // sky blue
      { r:147, g:197, b:253 },  // periwinkle blue
      { r:196, g:181, b:253 },  // lavender
    ];

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = ()  => { mouse.current = { x: -9999, y: -9999 }; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    const COUNT = Math.min(30, Math.floor((window.innerWidth * window.innerHeight) / 35000));
    const particles = Array.from({ length: COUNT }, () => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height,
        vx:   (Math.random() - 0.5) * 0.15,
        vy:   (Math.random() - 0.5) * 0.15,
        r:    Math.random() * 1.5 + 0.8,
        c,
        alpha: Math.random() * 0.12 + 0.08,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.005 + Math.random() * 0.008,
      };
    });

    // ── Nebula blobs (Larger, matching the picture's soft blue + pinkish shades) ──
    const BLOBS = [
      { x: 0.10, y: 0.15, r: 0.65, c: '251,207,232', t: 0, speed: 0.0002 },  // Soft Pinkish
      { x: 0.90, y: 0.85, r: 0.70, c: '186,230,253', t: Math.PI, speed: 0.00015 },  // Light Sky Blue
      { x: 0.35, y: 0.80, r: 0.60, c: '219,234,254', t: Math.PI/2, speed: 0.00012 },  // Periwinkle Blue
      { x: 0.80, y: 0.20, r: 0.55, c: '243,232,255', t: Math.PI*1.5, speed: 0.00022 },  // Soft Lavender
    ];

    const CONNECT_DIST = 180;
    const REPEL_DIST   = 160;
    const REPEL_FORCE  = 0.8;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;

      // Base light sky-blue background fill matching the picture
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, 0, W, H);

      // ── Draw blended nebula blobs (Mesh gradient style) ──
      BLOBS.forEach(b => {
        b.t += b.speed;
        const bx = (b.x + Math.sin(b.t) * 0.08) * W;
        const by = (b.y + Math.cos(b.t * 0.5) * 0.08) * H;
        const br = b.r * Math.max(W, H);
        const alpha = 0.22 + Math.sin(b.t * 0.8) * 0.05;
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0,   `rgba(${b.c},${alpha})`);
        grad.addColorStop(0.5, `rgba(${b.c},${alpha * 0.5})`);
        grad.addColorStop(1,   `rgba(${b.c},0)`);
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // ── Draw particles ──
      particles.forEach(p => {
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_DIST && dist > 0) {
          const force = (REPEL_DIST - dist) / REPEL_DIST * REPEL_FORCE;
          p.vx += (dx / dist) * force * 0.025;
          p.vy += (dy / dist) * force * 0.025;
        }

        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        p.pulse += p.pulseSpeed;
        const pr = p.r + Math.sin(p.pulse) * 0.3;

        const { r, g, b } = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();
      });

      // ── Connection lines ──
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], bv = particles[j];
          const dx = a.x - bv.x, dy = a.y - bv.y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < CONNECT_DIST) {
            const opacity = (1 - d / CONNECT_DIST) * 0.05;
            const { r: r1, g: g1, b: b1 } = a.c;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(bv.x, bv.y);
            ctx.strokeStyle = `rgba(${r1},${g1},${b1},${opacity})`;
            ctx.lineWidth   = 0.4;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
