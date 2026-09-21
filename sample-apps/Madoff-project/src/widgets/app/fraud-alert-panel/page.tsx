'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styles from './styles.module.css';

function FraudAlertPanelContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  let alerts: string[] = [];
  
  if (dataParam) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(dataParam));
      alerts = parsedData.alerts || [];
    } catch (e) {
      console.error('Failed to parse widget data:', e);
    }
  }

  return (
    <div className={styles.panelContainer}>
      <h3 className={styles.title}>Fraud Alerts ({alerts.length})</h3>
      {alerts.length === 0 ? (
        <div className={styles.emptyState}>No critical alerts found.</div>
      ) : (
        <ul className={styles.alertList}>
          {alerts.map((alert, idx) => (
            <li key={idx} className={styles.alertItem}>
              <span className={styles.icon}>⚠️</span>
              <span className={styles.text}>{alert}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FraudAlertPanel() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FraudAlertPanelContent />
    </Suspense>
  );
}
