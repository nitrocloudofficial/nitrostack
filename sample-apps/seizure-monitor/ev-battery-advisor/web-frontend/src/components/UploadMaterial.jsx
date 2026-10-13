import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileText, Database, RotateCcw } from 'lucide-react';

export default function UploadMaterial({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isCustomActive, setIsCustomActive] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setSuccess(null);
      setPreview(null);
      
      // Basic preview
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          if (selected.name.endsWith('.json')) {
            const json = JSON.parse(e.target.result);
            setPreview(Array.isArray(json) ? json : [json]);
          } else if (selected.name.endsWith('.csv')) {
            // Very simple CSV preview
            const lines = e.target.result.split('\n');
            const headers = lines[0].split(',');
            setPreview(`CSV with ${headers.length} columns and ${lines.length - 1} rows.`);
          }
        } catch (err) {
          console.error("Preview error", err);
        }
      };
      reader.readAsText(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3002/api/materials/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        setSuccess(`Successfully ingested ${result.count || 1} material(s).`);
        setIsCustomActive(true);
        if (onUploadSuccess) onUploadSuccess(result.data?.name || result.data?.materialName || 'Custom Material');
        setFile(null);
        setPreview(null);
      } else {
        setError(result.error || 'Failed to upload material data.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/reset-dataset', { method: 'POST' });
      const result = await res.json();
      if (result.status === 'success') {
        setIsCustomActive(false);
        setSuccess(null);
        if (onUploadSuccess) onUploadSuccess(null);
      }
    } catch (err) {
      setError('Failed to reset dataset: ' + err.message);
    }
  };

  return (
    <div className="bg-[#111827] p-6 rounded-xl border border-[#1f2937] text-white h-full flex flex-col">
      <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
        <UploadCloud className="text-blue-400" /> Upload Custom Materials
      </h3>

      {/* Active dataset mode badge */}
      <div className="flex items-center gap-2 mb-4">
        {isCustomActive ? (
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Database size={11} /> Custom Dataset Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/30">
            <Database size={11} /> Built-in Database
          </span>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Upload experimental material properties (CSV or JSON). When active, <span className="text-blue-300 font-medium">only your dataset</span> will be used — built-in materials are excluded.
      </p>

      <div className="border-2 border-dashed border-[#374151] rounded-lg p-8 text-center hover:bg-[#1f2937] transition-colors relative flex-1 flex flex-col items-center justify-center min-h-[150px]">
        <input 
          type="file" 
          accept=".csv,.json" 
          onChange={handleFileChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3">
          <FileText size={32} className="text-gray-500" />
          {file ? (
            <span className="font-medium text-blue-400">{file.name}</span>
          ) : (
            <>
              <span className="font-medium text-gray-300">Drag &amp; drop a file here</span>
              <span className="text-xs text-gray-500">Supports .csv, .json</span>
            </>
          )}
        </div>
      </div>

      {preview && (
        <div className="mt-4 p-3 bg-gray-800 rounded text-sm text-gray-300 overflow-x-auto">
          {typeof preview === 'string' ? preview : `JSON payload detected with ${preview.length} item(s)`}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className={`mt-4 w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2
          ${!file || isUploading 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-[0.99]'}`}
      >
        {isUploading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading &amp; Parsing...
          </>
        ) : (
          <><UploadCloud size={18} /> Process Dataset</>
        )}
      </button>

      {/* Reset to built-in button — only visible when custom dataset is active */}
      {isCustomActive && (
        <button
          onClick={handleReset}
          className="mt-2 w-full py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 active:scale-[0.99]"
        >
          <RotateCcw size={14} /> Use Built-in Database
        </button>
      )}
    </div>
  );
}
