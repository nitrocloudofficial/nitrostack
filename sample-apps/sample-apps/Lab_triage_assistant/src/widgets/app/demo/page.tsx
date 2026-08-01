'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { TriageResults, type FlagCriticalData, type Routing } from '../../components/TriageResults';
import { callMcpTool } from '../../lib/mcpClient';

const SAMPLE_REPORT = `Hemoglobin : 13.5 g/dL
Creatinine : 1.5 mg/dL
FastingGlucose : 250 mg/dL`;

interface RunFullTriageOutput extends FlagCriticalData {
  routing: Routing[];
  summaryText: string;
  unparsedLines: string[];
}

interface OcrOutput {
  extractedText: string;
  confidence: number;
}

export default function DemoPage() {
  const [reportText, setReportText] = useState(SAMPLE_REPORT);
  const [result, setResult] = useState<RunFullTriageOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runAnalysis = async (text: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const output = await callMcpTool<RunFullTriageOutput>('run_full_triage', { reportText: text });
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong analyzing this report.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrConfidence(null);
    setError(null);
    setResult(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      });

      const ocrResult = await callMcpTool<OcrOutput>('ocr_report_image', {
        file_name: file.name,
        file_type: file.type,
        file_content: dataUrl
      });

      setOcrConfidence(ocrResult.confidence);
      setReportText(ocrResult.extractedText);
      await runAnalysis(ocrResult.extractedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.');
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copySummary = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const busy = loading || ocrLoading;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f14',
        color: '#f5f5f5',
        fontFamily: 'system-ui, sans-serif',
        padding: '48px 20px'
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Lab Report Triage Assistant</h1>
          <p style={{ fontSize: 14, color: 'rgba(245,245,245,0.6)', margin: '8px 0 0 0' }}>
            Upload a photo of your lab report, or paste the text below, to see what's normal, what needs attention, and who to see.
          </p>
        </div>

        {/* Photo upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '1px dashed rgba(255,255,255,0.25)',
            borderRadius: 12,
            padding: '20px 16px',
            textAlign: 'center',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {ocrLoading ? 'Reading photo...' : '📷 Upload a photo of your report'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.5)', marginTop: 4 }}>
            {ocrLoading ? 'Running OCR — this can take a few seconds' : 'JPG or PNG · we run OCR automatically'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={busy}
            style={{ display: 'none' }}
          />
        </div>

        {ocrConfidence !== null && (
          <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.5)', marginTop: -12 }}>
            OCR confidence: {ocrConfidence.toFixed(0)}%{ocrConfidence < 70 ? ' — consider retaking the photo or checking the text below' : ''}
          </div>
        )}

        <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.4)', textAlign: 'center' }}>— or paste the text directly —</div>

        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#161c24',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
            color: '#f5f5f5',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            resize: 'vertical'
          }}
        />

        <button
          onClick={() => runAnalysis(reportText)}
          disabled={busy || !reportText.trim()}
          style={{
            alignSelf: 'flex-start',
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 20px',
            borderRadius: 999,
            border: 'none',
            background: loading ? 'rgba(59,130,246,0.5)' : '#3b82f6',
            color: 'white',
            cursor: busy ? 'default' : 'pointer'
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Report'}
        </button>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', borderRadius: 12, padding: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {result && (
          <>
            <TriageResults
              data={{ flagged: result.flagged, overallTriage: result.overallTriage, summary: result.summary }}
              routing={result.routing}
              isRouting={false}
              routingError={null}
              isDark={true}
            />

            {result.unparsedLines.length > 0 && (
              <div style={{ fontSize: 12, color: 'rgba(245,245,245,0.5)' }}>
                Couldn't read {result.unparsedLines.length} line{result.unparsedLines.length > 1 ? 's' : ''}: {result.unparsedLines.join('; ')}
              </div>
            )}

            <div style={{ background: '#161c24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Shareable Summary</span>
                <button
                  onClick={copySummary}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#f5f5f5',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  fontSize: 12,
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(245,245,245,0.85)'
                }}
              >
                {result.summaryText}
              </pre>
            </div>

            <div style={{ fontSize: 11, color: 'rgba(245,245,245,0.5)', textAlign: 'center' }}>
              This is not a diagnosis. Please discuss these results with a doctor.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
