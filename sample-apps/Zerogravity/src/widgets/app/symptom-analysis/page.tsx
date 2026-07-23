'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface SymptomAnalysisData {
  patientId: string;
  recordId?: string;
  symptomDescription: string;
  detectedRedFlags: Array<{
    id: string;
    keywords: string[];
    severity: number;
    category: string;
    description: string;
  }>;
  candidateConditions: Array<{
    name: string;
    specialty: string;
    confidence: number;
    reasoning: string;
  }>;
  confidenceScore: number;
  timestamp: string;
}

export default function SymptomAnalysisWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<SymptomAnalysisData>();

  if (!isReady) {
    return (
      <div style={{
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: theme === 'dark' ? '#aaa' : '#666'
      }}>
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: theme === 'dark' ? '#aaa' : '#666'
      }}>
        No data
      </div>
    );
  }

  const isDark = theme === 'dark';
  const textColor = isDark ? '#e0e0e0' : '#1a1a1a';
  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';

  return (
    <pre style={{
      padding: '16px',
      background: bgColor,
      color: textColor,
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '1.5',
      overflow: 'auto',
      borderRadius: '4px',
      margin: '0'
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
