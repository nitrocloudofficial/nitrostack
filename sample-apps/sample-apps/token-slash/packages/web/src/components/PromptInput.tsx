import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  FileSpreadsheet, 
  File, 
  Clipboard, 
  RotateCcw, 
  Zap, 
  History as HistoryIcon, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  previewUrl?: string;
}

interface PromptInputProps {
  onSubmit: (promptText: string) => void;
  isLoading: boolean;
  onClear: () => void;
  onLoadSample: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading, onClear, onLoadSample }) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    }
  }, [prompt]);

  // Telemetry metrics
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;
  const estimatedTokens = Math.ceil(charCount / 3.8); // Approximately 3.8 chars per token

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPrompt((prev) => (prev ? `${prev}\n\n${text}` : text));
        if (errorMessage) setErrorMessage(null);
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleFileUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (errorMessage) setErrorMessage(null);

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        const isImage = file.type.startsWith('image/');
        const newFile: UploadedFile = {
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          content: isImage ? `[Image Reference: ${file.name}]` : content,
          previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        };

        setFiles((prev) => [...prev, newFile]);
        // Append file content to prompt text so it submits cleanly without altering backend contract!
        if (!isImage && content) {
          setPrompt((prev) => `${prev ? prev + '\n\n' : ''}=== FILE: ${file.name} ===\n${content.slice(0, 5000)}${content.length > 5000 ? '\n...[truncated]' : ''}`);
        } else if (isImage) {
          setPrompt((prev) => `${prev ? prev + '\n\n' : ''}[Attached Image: ${file.name}]`);
        }
      };

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && files.length === 0) {
      setErrorMessage('Please enter a prompt or attach a document before running analysis.');
      return;
    }
    setErrorMessage(null);
    onSubmit(prompt);
  };

  const handleClearAll = () => {
    setPrompt('');
    setFiles([]);
    setErrorMessage(null);
    onClear();
  };

  const getFileIcon = (type: string, name: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-purple-400" />;
    if (name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.md')) {
      return <FileCode className="w-4 h-4 text-cyan-400" />;
    }
    if (name.endsWith('.csv') || name.endsWith('.xls')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    }
    return <FileText className="w-4 h-4 text-blue-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Title & Badge Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400 mb-3">
            <Terminal className="w-3.5 h-3.5" />
            <span>AI OPTIMIZATION WORKSPACE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Supercharge Your Prompts
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Paste verbose instructions, legacy prompts, or code specs. TokenSlash’s MCP engine eliminates token bloat and maps tasks to the most cost-effective LLM tier in under 3 seconds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Hackathon Demo Prompt</span>
          </button>
        </div>
      </div>

      {/* Main Command Center Box */}
      <form onSubmit={handleSubmit} className="relative">
        <div 
          className={`rounded-2xl bg-[#131822]/95 backdrop-blur-xl border transition-all duration-300 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.5)] ${
            isDragging 
              ? 'border-cyan-400 bg-cyan-500/[0.05] shadow-[0_0_40px_rgba(0,242,254,0.2)]' 
              : 'border-white/[0.08] hover:border-white/[0.14] focus-within:border-cyan-500/50 focus-within:shadow-[0_0_35px_rgba(0,242,254,0.12)]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileUpload(e.dataTransfer.files);
          }}
        >
          {/* Staged Files Display */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/[0.06]"
              >
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#1D2532] border border-white/10 text-xs text-slate-200 group"
                  >
                    {getFileIcon(file.type, file.name)}
                    <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">({formatFileSize(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="text-slate-500 hover:text-rose-400 ml-1 p-0.5 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleTextChange}
              placeholder="Describe your prompt or paste it here... (e.g., 'Act as a Senior Architect, create a TypeScript React data table with Zod validation...')"
              className="w-full min-h-[160px] max-h-[420px] bg-transparent border-none text-white placeholder:text-slate-500 text-base leading-relaxed focus:outline-none focus:ring-0 resize-none custom-scrollbar font-mono sm:font-sans"
              disabled={isLoading}
            />

            {/* Drag & Drop overlay cue */}
            {isDragging && (
              <div className="absolute inset-0 bg-[#131822]/90 rounded-xl border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center gap-2 text-cyan-400 pointer-events-none z-10 animate-pulse">
                <Upload className="w-8 h-8" />
                <span className="font-semibold text-sm font-mono">Drop files to stage as prompt context</span>
              </div>
            )}
          </div>

          {/* Console Footer Toolbar */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left: Telemetry Counter Pill */}
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Words:</span>
                <span className="text-white font-semibold">{wordCount}</span>
              </div>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Chars:</span>
                <span className="text-white font-semibold">{charCount}</span>
              </div>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded text-cyan-400">
                <span>Est. Tokens:</span>
                <span className="font-bold">{estimatedTokens}</span>
              </div>
            </div>

            {/* Right: Secondary Actions */}
            <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e.target.files)}
                multiple
                accept=".txt,.md,.json,.csv,.pdf,.docx,image/*"
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Upload PDF, TXT, MD, JSON, CSV or Image"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload</span>
              </button>

              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5 text-blue-400" />
                <span>Paste</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={isLoading || (!prompt && files.length === 0)}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 hover:border-rose-500/20 border border-white/[0.08] text-xs font-medium text-slate-400 hover:text-rose-400 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
                title="Clear all text and files"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              {/* Primary Analyze Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="ml-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-[0_0_25px_rgba(0,242,254,0.3)] hover:shadow-[0_0_35px_rgba(0,242,254,0.5)] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none group border border-white/20"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white group-hover:rotate-45 transition-transform duration-300" />
                    <span>Analyze Prompt</span>
                    <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Error Alert Box */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm shadow-lg"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span className="flex-1 font-medium">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white underline font-mono ml-auto"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
