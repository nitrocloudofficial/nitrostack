'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/calculator-result');
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      Loading MedGuard widget...
    </div>
  );
}
