import React, { useState, useEffect } from 'react';
import { Upload, Trash2, File, AlertCircle, CheckCircle2, FileUp } from 'lucide-react';

export default function UploadCenter({ user, token }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
    setFeedback(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one document.' });
      return;
    }

    setUploading(true);
    setFeedback(null);
    let successCount = 0;
    let failCount = 0;

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          successCount++;
        } else {
          const errData = await response.json();
          console.error(`Upload failed for ${file.name}:`, errData.detail);
          failCount++;
        }
      } catch (err) {
        console.error(`Upload error for ${file.name}:`, err.message);
        failCount++;
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    document.getElementById('file-uploader-input').value = '';

    if (successCount > 0 && failCount === 0) {
      setFeedback({ type: 'success', message: `Successfully processed ${successCount} files.` });
    } else if (successCount > 0 && failCount > 0) {
      setFeedback({ type: 'warning', message: `Processed ${successCount} files, but ${failCount} failed.` });
    } else {
      setFeedback({ type: 'error', message: 'Failed to process selected files.' });
    }

    fetchDocuments();
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFeedback({ type: 'success', message: `Successfully deleted document '${filename}'` });
        fetchDocuments();
      } else {
        const errData = await response.json();
        throw new Error(errData.detail || 'Delete failed');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Failed to delete '${filename}': ${err.message}` });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <FileUp className="text-blue-500" size={30} />
          Upload Center
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Ingest contract documents, financial spreadsheets, and operational checksheets into VeriChain.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Column */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-5">
          <div className="border-b border-glassBorder/40 pb-4">
            <h3 className="text-lg font-bold text-white">Add Corporate Files</h3>
            <p className="text-xs text-gray-400 mt-1">Supported formats: PDF, DOCX, CSV, XLSX, and TXT.</p>
          </div>

          {feedback && (
            <div className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
              feedback.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-5">
            <div className="border-2 border-dashed border-glassBorder/60 hover:border-blue-500/50 rounded-2xl p-8 text-center cursor-pointer bg-gray-950/40 relative group transition-colors">
              <input 
                id="file-uploader-input"
                type="file" 
                multiple 
                accept=".pdf,.docx,.csv,.xlsx,.txt"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Upload size={36} className="text-gray-500 mx-auto mb-4 group-hover:text-blue-400 transition-colors" />
              <div className="font-bold text-gray-200 text-sm mb-1">
                {selectedFiles.length > 0 ? `Selected ${selectedFiles.length} file(s)` : 'Select files to upload'}
              </div>
              <div className="text-xs text-gray-500 max-w-xs mx-auto truncate">
                {selectedFiles.length > 0 
                  ? selectedFiles.map(f => f.name).join(', ') 
                  : 'Click or drag files here to stage'
                }
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? 'Processing & Registering Files...' : 'Process & Register Files'}
            </button>
          </form>
        </div>

        {/* Documents list registry */}
        <div className="bg-glassBg border border-glassBorder rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-5">
          <div className="border-b border-glassBorder/40 pb-4">
            <h3 className="text-lg font-bold text-white">Documents Registry</h3>
            <p className="text-xs text-gray-400 mt-1">Staged operational data source files catalog.</p>
          </div>
          
          {loading ? (
            <div className="text-xs text-gray-500 animate-pulse">Loading staged files...</div>
          ) : documents.length > 0 ? (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {documents.map(doc => {
                const sizeKb = doc.file_size / 1024;
                return (
                  <div 
                    key={doc.id} 
                    className="flex justify-between items-center p-3 bg-gray-950/40 border border-glassBorder rounded-xl hover:border-glassBorder/70 transition-colors"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400 flex-shrink-0 border border-blue-500/20">
                        <File size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-200 text-sm truncate">{doc.filename}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono mt-0.5">{doc.file_type.split('/')[1] || 'TXT'}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 items-center flex-shrink-0">
                      <span className="text-xs text-blue-400 font-bold">
                        {sizeKb < 1024 ? `${sizeKb.toFixed(1)} KB` : `${(sizeKb/1024).toFixed(1)} MB`}
                      </span>
                      <button 
                        className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all duration-200"
                        onClick={() => handleDelete(doc.id, doc.filename)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center py-12 border border-dashed border-glassBorder/50 rounded-2xl">
              No files currently registered in context database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
