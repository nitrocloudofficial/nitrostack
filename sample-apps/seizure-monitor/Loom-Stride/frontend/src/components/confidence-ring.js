export function renderConfidenceRing(confidence) {
  const pct = Math.round(confidence * 100);
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - confidence * circumference;
  
  const strokeColor = confidence >= 0.85 
    ? '#10b981' 
    : confidence >= 0.7 
      ? '#f59e0b' 
      : '#ef4444';

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" style="transform: rotate(-90deg);">
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          stroke-width="${strokeWidth}"
        />
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          stroke-linecap="round"
          style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);"
        />
      </svg>
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
      ">
        <span style="font-size: 16px; font-weight: 800; color: #fff;">${pct}%</span>
        <span style="font-size: 9px; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase;">Conf</span>
      </div>
    </div>
  `;
}
