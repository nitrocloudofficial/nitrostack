'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styles from './styles.module.css';

function ClaimViewerContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get('data');
  let claim: any = {};
  
  if (dataParam) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(dataParam));
      claim = parsedData.claim || {};
    } catch (e) {
      console.error('Failed to parse widget data:', e);
    }
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Claim Viewer: {claim.claimId || 'Unknown'}</h3>
      <pre className={styles.json}>{JSON.stringify(claim, null, 2)}</pre>
    </div>
  );
}

export default function ClaimViewer() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClaimViewerContent />
    </Suspense>
  );
}
