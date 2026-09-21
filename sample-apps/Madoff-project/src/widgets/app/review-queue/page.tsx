'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styles from './styles.module.css';

function ReviewQueueContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  let queue: any[] = [];
  
  if (dataParam) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(dataParam));
      queue = parsedData.queue || [];
    } catch (e) {
      console.error('Failed to parse widget data:', e);
    }
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Review Queue</h3>
      <div className={styles.list}>
        {queue.length === 0 ? (
          <p className={styles.empty}>No items in queue.</p>
        ) : (
          queue.map((item, idx) => (
            <div key={idx} className={styles.item}>
              <span className={styles.id}>{item.claimId}</span>
              <span className={styles.status}>{item.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ReviewQueue() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewQueueContent />
    </Suspense>
  );
}
