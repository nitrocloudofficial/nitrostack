'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import './upload.css';

interface UploadData {
    success: boolean;
    course_name?: string;
    total_files_processed?: number;
    results?: { file_name: string; extracted_items?: number; document_id?: string; error?: string }[];
}

export default function UploadPage() {
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<UploadData>();

    if (!isReady || !data) {
        return (
            <div className="upload-container animate-fade-in">
                <p style={{ color: '#94a3b8' }}>Processing documents...</p>
            </div>
        );
    }

    if (data.success === false || (data as any).error || typeof data === 'string') {
        const errorMsg = (data as any).error || (typeof data === 'string' ? data : "There was an error processing your documents.");
        return (
            <div className="upload-container animate-fade-in">
                <div className="success-card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div className="success-icon">❌</div>
                    <h2 style={{ color: '#f87171' }}>Upload Failed</h2>
                    <p style={{ color: '#fca5a5' }}>{errorMsg}</p>
                </div>
            </div>
        );
    }

    const totalExtracted = data.results?.reduce((acc, curr) => acc + (curr.extracted_items || 0), 0) || 0;

    return (
        <div className="upload-container animate-fade-in">
            <div className="success-card">
                <div className="success-icon">✨</div>
                <h2>Documents Uploaded</h2>
                <p>Successfully processed and saved to course: <strong>{data.course_name || 'Unknown'}</strong></p>

                <div className="stats-grid">
                    <div className="stat-box">
                        <span className="stat-value">{data.total_files_processed || 1}</span>
                        <span className="stat-label">Files Processed</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">{totalExtracted}</span>
                        <span className="stat-label">Items Extracted</span>
                    </div>
                </div>

                <div className="doc-id-box" style={{ textAlign: 'left', fontSize: '0.85rem' }}>
                    <strong>Processed Files:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                        {data.results?.map((res, idx) => (
                            <li key={idx} style={{ color: res.error ? '#f87171' : 'inherit' }}>
                                {res.file_name} {res.error ? `(Error: ${res.error})` : `(${res.extracted_items || 0} items)`}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
