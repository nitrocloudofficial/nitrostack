'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styles from './styles.module.css';

function ConfidenceGaugeContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  let score = 0;
  
  if (dataParam) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(dataParam));
      score = parsedData.score || 0;
    } catch (e) {
      console.error('Failed to parse widget data:', e);
    }
  }

  const percentage = Math.round(score * 100);
  const isHighRisk = score < 0.8;

  return (
    <div className={`${styles.gaugeContainer} ${isHighRisk ? styles.danger : styles.safe}`}>
      <h3 className={styles.title}>AI Confidence Score</h3>
      <div className={styles.gauge}>
        <div className={styles.gaugeFill} style={{ width: `${percentage}%` }}></div>
      </div>
      <div className={styles.scoreText}>{percentage}%</div>
      <p className={styles.description}>
        {isHighRisk ? 'Requires Manual Review' : 'High Confidence Auto-Process'}
      </p>
    </div>
  );
}

export default function ConfidenceGauge() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfidenceGaugeContent />
    </Suspense>
  );
}
