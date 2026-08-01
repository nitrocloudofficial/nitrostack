import React, { useEffect, useRef, useState } from 'react';

interface SavingsCounterProps {
  targetAmount: number;
  currencySymbol?: string;
  duration?: number; // ms
}

export const SavingsCounter: React.FC<SavingsCounterProps> = ({
  targetAmount,
  currencySymbol = '₹',
  duration = 1800,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = Math.round(easedProgress * targetAmount);

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [hasStarted, targetAmount, duration]);

  return (
    <span
      ref={containerRef}
      className="font-black text-emerald-500 dark:text-emerald-400 font-mono tabular-nums"
    >
      {currencySymbol}
      {displayValue.toLocaleString('en-IN')}
    </span>
  );
};
