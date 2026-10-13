import { useEffect, useRef } from 'react';

export function useAnimateOnMount(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    const t = setTimeout(() => {
      if (el) {
        el.style.transition = 'opacity 350ms ease-out, transform 350ms ease-out';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);
  return ref;
}

export function useCountUp(target: number, duration = 600, delay = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = 0;
    const t = setTimeout(() => {
      const startTime = performance.now();
      function tick(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        if (el) el.textContent = String(current);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return ref;
}

export const fadeIn = (delay = 0): React.CSSProperties => ({
  animation: `fadeIn 350ms ease-out ${delay}ms both`,
});

export const keyframes = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes drawArc { from { stroke-dashoffset: var(--arc-len); } to { stroke-dashoffset: var(--arc-target); } }
@keyframes fillBar { from { width: 0; } }
@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(6,118,71,0.3); } 50% { box-shadow: 0 0 0 8px rgba(6,118,71,0); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes slideRight { from { width: 0; } }
@keyframes checkPop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
`;
