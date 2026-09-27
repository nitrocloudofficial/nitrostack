'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styles from './styles.module.css';

function InvestigationTimelineContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  let timeline: any[] = [];
  
  if (dataParam) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(dataParam));
      timeline = parsedData.timeline || [];
    } catch (e) {
      console.error('Failed to parse widget data:', e);
    }
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Investigation Timeline</h3>
      <div className={styles.timeline}>
        {timeline.length === 0 ? (
          <p className={styles.empty}>No events to display.</p>
        ) : (
          timeline.map((event, idx) => (
            <div key={idx} className={styles.event}>
              <div className={styles.dot}></div>
              <div className={styles.content}>
                <div className={styles.date}>{new Date(event.timestamp).toLocaleString()}</div>
                <div className={styles.desc}>{event.description}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function InvestigationTimeline() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvestigationTimelineContent />
    </Suspense>
  );
}
