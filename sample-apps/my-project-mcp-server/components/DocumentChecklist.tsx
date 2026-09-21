'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import { listDocuments, uploadDocument, ApiError } from '@/lib/api';
import type { DocumentId, DocumentRecord } from '@/lib/types';

export const DOCUMENT_DEFS: { id: DocumentId; label: string; desc: string }[] = [
  { id: 'discharge-summary', label: 'Discharge Summary', desc: 'Medical summary' },
  { id: 'id-proof', label: 'Government ID', desc: 'Aadhaar or Passport' },
  { id: 'policy-document', label: 'Policy Document', desc: 'Policy schedule' },
  { id: 'itemized-bill', label: 'Itemized Bill', desc: 'Detailed hospital bill' },
];

export const DOCUMENT_IDS = DOCUMENT_DEFS.map((d) => d.id);

export function DocumentChecklist({
  caseId,
  onChange,
}: {
  caseId: string | null;
  onChange?: (uploaded: DocumentId[]) => void;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loadedCaseId, setLoadedCaseId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<DocumentId | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (caseId !== loadedCaseId) {
    setLoadedCaseId(caseId);
    setDocuments([]);
  }

  // Keep the latest onChange without making the effect below re-run every
  // time the parent passes a new inline function reference.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    listDocuments(caseId)
      .then((docs) => {
        if (cancelled) return;
        setDocuments(docs);
        onChangeRef.current?.(docs.map((d) => d.documentId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  async function handleUpload(id: DocumentId, files: FileList | null) {
    if (!files || files.length === 0 || !caseId) return;
    setUploadingId(id);
    setUploadError(null);
    try {
      const updated = await uploadDocument(caseId, id, files[0]);
      setDocuments(updated);
      onChange?.(updated.map((d) => d.documentId));
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader title="Documents" />
      <CardBody className="space-y-3">
        {!caseId && (
          <p className="text-xs text-slate-500">Submit the case form first to enable file uploads.</p>
        )}
        
        {uploadError && <p className="text-xs text-amber-700">⚠️ {uploadError}</p>}

        <div className="grid grid-cols-1 gap-2.5">
          {DOCUMENT_DEFS.map((doc) => {
            const isUploaded = documents.some((d) => d.documentId === doc.id);
            const isUploading = uploadingId === doc.id;
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/50 bg-white/35 backdrop-blur-md p-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-bold ${
                    isUploaded ? 'bg-teal-600 text-white' : 'bg-white/40 backdrop-blur-md text-slate-400'
                  }`}>
                    {isUploaded ? '✓' : '📄'}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{doc.label}</span>
                    <span className="ml-2 text-slate-400">({doc.desc})</span>
                  </div>
                </div>

                {isUploaded ? (
                  <Badge tone="verified" className="text-[10px] py-0 px-2">Uploaded</Badge>
                ) : caseId ? (
                  <label className="cm-button shrink-0 cursor-pointer text-xs py-1 px-2.5">
                    {isUploading ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => handleUpload(doc.id, e.target.files)}
                    />
                  </label>
                ) : (
                  <Badge tone="amber" className="text-[10px] py-0 px-2">Required</Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
