"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, ImageIcon, X, CheckCircle, Loader2, AlertCircle, FileType, Eye } from "lucide-react";

type FileStatus = "pending" | "processing" | "done" | "error";
type UploadedFile = {
  id: number; file: File; status: FileStatus;
  step: number; progress: number; preview?: string;
};

const PROCESSING_STEPS = [
  "📄 Extracting text...",
  "🔍 Running OCR...",
  "✂️ Chunking content...",
  "🧠 Generating embeddings...",
  "💾 Storing in vector DB...",
];

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

function getFileIcon(file: File) {
  if (file.type === "application/pdf") return "📄";
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) return "📊";
  return "📝";
}

function getFileColor(file: File) {
  if (file.type === "application/pdf") return "from-red-500 to-rose-600";
  if (file.type.startsWith("image/")) return "from-purple-500 to-violet-600";
  if (file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) return "from-orange-500 to-amber-600";
  return "from-blue-500 to-indigo-600";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function simulateProcessing(setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>, id: number) {
  for (let step = 0; step < PROCESSING_STEPS.length; step++) {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    setFiles(prev => prev.map(f => f.id === id ? { ...f, step, progress: ((step + 1) / PROCESSING_STEPS.length) * 100, status: "processing" } : f));
  }
  await new Promise(r => setTimeout(r, 300));
  setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "done", progress: 100 } : f));
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadedFile[] = accepted.map(file => ({
      id: Date.now() + Math.random(), file, status: "pending", step: -1, progress: 0,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      setTimeout(() => simulateProcessing(setFiles, f.id), 500);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED_TYPES, maxSize: 25 * 1024 * 1024,
    onDropRejected: (rejected) => {
      alert(`File rejected: ${rejected[0]?.errors[0]?.message}`);
    },
  });

  const removeFile = (id: number) => setFiles(prev => prev.filter(f => f.id !== id));

  const doneCount = files.filter(f => f.status === "done").length;
  const totalCount = files.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Upload Study Material</h2>
        <p className="text-slate-500">Upload PDFs, PPTs, DOCX, or handwritten note photos. AI will process and index them instantly.</p>
      </div>

      {/* Drop zone */}
      <motion.div
        {...getRootProps()}
        animate={{ scale: isDragActive ? 1.02 : 1 }}
        className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/50"
        }`}>
        <input {...getInputProps()} />
        <motion.div animate={{ y: isDragActive ? -8 : 0 }} transition={{ type: "spring" }}>
          <div className={`w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center ${isDragActive ? "gradient-primary" : "bg-slate-100"}`}>
            <Upload className={`w-10 h-10 ${isDragActive ? "text-white" : "text-slate-400"}`} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {isDragActive ? "Drop your files here!" : "Drag & Drop your files"}
          </h3>
          <p className="text-slate-500 mb-4">or <span className="text-blue-600 font-semibold underline cursor-pointer">click to browse</span></p>
          <div className="flex flex-wrap justify-center gap-2">
            {["PDF", "PPT/PPTX", "DOC/DOCX", "PNG/JPG", "Handwritten"].map(type => (
              <span key={type} className="badge-blue text-xs px-3 py-1 rounded-full font-medium">{type}</span>
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-4">Maximum file size: 25 MB per file</p>
        </motion.div>
      </motion.div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Uploading Files</h3>
                <p className="text-slate-500 text-sm">{doneCount}/{totalCount} processed</p>
              </div>
              {doneCount === totalCount && totalCount > 0 && (
                <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                  <CheckCircle className="w-5 h-5" /> All done! Files are indexed.
                </div>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {files.map((uploadedFile) => (
                <motion.div key={uploadedFile.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="flex items-start gap-4 p-5">
                  {/* File icon / preview */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getFileColor(uploadedFile.file)} flex items-center justify-center flex-shrink-0 text-2xl`}>
                    {uploadedFile.preview ? (
                      <img src={uploadedFile.preview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                    ) : getFileIcon(uploadedFile.file)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 text-sm truncate">{uploadedFile.file.name}</span>
                      <button onClick={() => removeFile(uploadedFile.id)} className="text-slate-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-slate-500 text-xs mb-2">{formatBytes(uploadedFile.file.size)}</div>
                    {/* Status */}
                    {uploadedFile.status === "pending" && <div className="text-slate-400 text-xs">Waiting to process...</div>}
                    {uploadedFile.status === "processing" && (
                      <>
                        <div className="flex items-center gap-2 text-blue-600 text-xs mb-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {PROCESSING_STEPS[uploadedFile.step] || "Processing..."}
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            animate={{ width: `${uploadedFile.progress}%` }} transition={{ duration: 0.5 }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-slate-400">Step {Math.max(0, uploadedFile.step + 1)}/{PROCESSING_STEPS.length}</span>
                          <span className="text-xs text-blue-600 font-medium">{Math.round(uploadedFile.progress)}%</span>
                        </div>
                      </>
                    )}
                    {uploadedFile.status === "done" && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 text-xs font-semibold">Processed & indexed in vector DB</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supported formats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">What happens when you upload?</h3>
        <div className="grid md:grid-cols-5 gap-4">
          {[
            { step: "1", icon: "📤", title: "File Upload", desc: "Secure file validation & storage" },
            { step: "2", icon: "👁️", title: "OCR/Extraction", desc: "Text extracted from PDF/images" },
            { step: "3", icon: "✂️", title: "Smart Chunking", desc: "Content split into semantic chunks" },
            { step: "4", icon: "🧠", title: "AI Embeddings", desc: "Sentence Transformers encode chunks" },
            { step: "5", icon: "🗄️", title: "Vector Store", desc: "Stored in FAISS/ChromaDB" },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 bg-slate-50 rounded-xl">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="font-semibold text-slate-800 text-sm mb-1">{s.title}</div>
              <div className="text-slate-500 text-xs">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
