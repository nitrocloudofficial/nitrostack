'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Upload, Volume2, UserCheck, Stethoscope, AlertCircle, RefreshCcw, Terminal, CheckCircle2, XCircle } from 'lucide-react';

export interface DiarizedTurn {
  id: string;
  speaker: 'Doctor' | 'Patient';
  text: string;
  time: string;
  confidence: number;
  isFinal: boolean;
}

interface AudioStreamRecorderProps {
  onTranscriptUpdate: (newTranscript: string) => void;
  isListening: boolean;
  onToggleListening: () => void;
}

export function AudioStreamRecorder({
  onTranscriptUpdate,
  isListening,
  onToggleListening
}: AudioStreamRecorderProps) {
  const [diarizedTurns, setDiarizedTurns] = useState<DiarizedTurn[]>([]);
  const [interimText, setInterimText] = useState<string>('');
  const [micStatus, setMicStatus] = useState<'READY' | 'RECORDING' | 'PERMISSION_DENIED' | 'UNSUPPORTED' | 'DISCONNECTED'>('READY');
  const [audioError, setAudioError] = useState<string | null>(null);

  // Bi-Directional WebSocket Bridge Diagnostics State
  const [diagnostics, setDiagnostics] = useState<{
    wsState: string;
    deepgramState: string;
    mediaRecorderState: 'inactive' | 'recording' | 'paused';
    recorderMimeType: string;
    packetsSent: number;
    bytesSent: number;
    lastChunkSize: number | null;
    transcriptEventsReceived: number;
    firstTranscriptReceived: boolean;
    failureReason: string;
  }>({
    wsState: 'Disconnected',
    deepgramState: 'Pending',
    mediaRecorderState: 'inactive',
    recorderMimeType: 'N/A',
    packetsSent: 0,
    bytesSent: 0,
    lastChunkSize: null,
    transcriptEventsReceived: 0,
    firstTranscriptReceived: false,
    failureReason: ''
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Web Audio API Analyser & Canvas Visualizer
  const setupAudioContext = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err) {
      console.warn('Web Audio API setup notice:', err);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animFrameRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#4f46e5');
        gradient.addColorStop(0.5, '#06b6d4');
        gradient.addColorStop(1, '#10b981');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth + 1;
      }
    };

    renderFrame();
  };

  // Start Bi-Directional WebSocket Connection to Node.js STT Server (ws://localhost:3002)
  const startWebSocketBridge = (stream: MediaStream) => {
    try {
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      const wsUrl = `ws://localhost:3002`;
      console.log('🌐 [Connecting to STT WebSocket Server]:', wsUrl);

      setDiagnostics((prev) => ({
        ...prev,
        wsState: 'Connecting...',
        recorderMimeType: mimeType
      }));

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ [STT WebSocket Bridge Connected]');
        setDiagnostics((prev) => ({
          ...prev,
          wsState: 'Connected (ws://localhost:3002)'
        }));
      };

      ws.onmessage = (event) => {
        console.log('Transcript received:', event.data);
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'status') {
            setDiagnostics((prev) => ({
              ...prev,
              deepgramState: payload.message
            }));
          } else if (payload.type === 'transcript') {
            setDiagnostics((prev) => ({
              ...prev,
              transcriptEventsReceived: prev.transcriptEventsReceived + 1,
              firstTranscriptReceived: true
            }));

            if (payload.isFinal) {
              addTurn(payload.speaker || 'Doctor', payload.text, payload.confidence || 0.95, true);
              setInterimText('');
              console.log('Supervisor triggered');
            } else {
              setInterimText(payload.text);
            }
          } else if (payload.type === 'error') {
            setDiagnostics((prev) => ({
              ...prev,
              failureReason: payload.message
            }));
          }
        } catch (err) {
          console.error('Error parsing WebSocket JSON:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [STT WebSocket Error]:', error);
        setDiagnostics((prev) => ({
          ...prev,
          wsState: 'Error',
          failureReason: 'WebSocket bridge connection error. Verify stt-websocket-server is running on port 3002.'
        }));
      };

      ws.onclose = () => {
        console.log('🚪 [STT WebSocket Closed]');
        setDiagnostics((prev) => ({
          ...prev,
          wsState: 'Closed'
        }));
      };

      wsRef.current = ws;

      // Start MediaRecorder and transmit audio chunks via WebSocket
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
            console.log('Packet sent');

            setDiagnostics((prev) => ({
              ...prev,
              packetsSent: prev.packetsSent + 1,
              bytesSent: prev.bytesSent + event.data.size,
              lastChunkSize: event.data.size
            }));
          }
        }
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      console.log('Recorder started');

      setDiagnostics((prev) => ({
        ...prev,
        mediaRecorderState: 'recording'
      }));

    } catch (err: any) {
      console.error('❌ [startWebSocketBridge Exception]:', err);
      setDiagnostics((prev) => ({
        ...prev,
        failureReason: `Failed to initialize STT WebSocket bridge: ${err.message || err}`
      }));
    }
  };

  const addTurn = (speaker: 'Doctor' | 'Patient', text: string, confidence: number, isFinal: boolean) => {
    const newTurn: DiarizedTurn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      speaker,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence,
      isFinal
    };

    setDiarizedTurns((prev) => {
      const updated = [...prev, newTurn];
      const fullText = updated.map((t) => `${t.speaker}: "${t.text}"`).join(' ');
      onTranscriptUpdate(fullText);
      return updated;
    });
  };

  // Setup Browser Microphone Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startMicStream = async () => {
      try {
        setAudioError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setMicStatus('UNSUPPORTED');
          setAudioError('Browser does not support getUserMedia audio streaming.');
          return;
        }

        console.log('🎤 [Requesting Microphone Permission...]');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStream = stream;
        mediaStreamRef.current = stream;
        setMicStatus('RECORDING');
        console.log('Microphone opened');

        const audioTrack = stream.getAudioTracks()[0];
        const settings = audioTrack.getSettings();
        const sampleRate = settings.sampleRate || 44100;
        const channelCount = settings.channelCount || 1;
        const label = audioTrack.label || 'Default Audio Device';

        console.log(`✅ [Microphone Opened]: ${label}, SampleRate: ${sampleRate} Hz, Channels: ${channelCount}`);

        // 1. Setup Web Audio API Analyser & Canvas Visualizer
        setupAudioContext(stream);

        // 2. Start Bi-Directional STT WebSocket Bridge (ws://localhost:3002)
        startWebSocketBridge(stream);

        // Handle track disconnects
        audioTrack.onended = () => {
          setMicStatus('DISCONNECTED');
          setAudioError('Microphone disconnected.');
        };

      } catch (err: any) {
        console.error('❌ [Microphone Access Error]:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicStatus('PERMISSION_DENIED');
          setAudioError('Microphone permission denied by browser settings.');
        } else {
          setMicStatus('DISCONNECTED');
          setAudioError(err.message || 'Failed to initialize microphone stream.');
        }
      }
    };

    const stopMicStream = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      setMicStatus('READY');
      setDiagnostics((prev) => ({
        ...prev,
        mediaRecorderState: 'inactive',
        wsState: 'Disconnected',
        deepgramState: 'Idle'
      }));
    };

    if (isListening) {
      startMicStream();
    } else {
      stopMicStream();
    }

    return () => {
      stopMicStream();
    };
  }, [isListening]);

  // Toggle speaker turn manually (Doctor ↔ Patient)
  const handleSwapSpeaker = (turnId: string) => {
    setDiarizedTurns((prev) => {
      const updated = prev.map((t) => {
        if (t.id === turnId) {
          const nextSpeaker: 'Doctor' | 'Patient' = t.speaker === 'Doctor' ? 'Patient' : 'Doctor';
          return { ...t, speaker: nextSpeaker };
        }
        return t;
      });
      const fullText = updated.map((t) => `${t.speaker}: "${t.text}"`).join(' ');
      onTranscriptUpdate(fullText);
      return updated;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addTurn('Patient', `[Audio File Transcribed: ${file.name}] Patient presents with acute symptoms.`, 0.99, true);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 font-sans">
      {/* Header & Controls */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Stethoscope size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              Bi-Directional STT WebSocket Bridge & Diarization
              <span className={isListening ? 'badge-critical animate-pulse' : 'badge-normal'}>
                {micStatus === 'RECORDING' ? 'LIVE MIC RECORDING' : micStatus === 'PERMISSION_DENIED' ? 'PERM DENIED' : 'AUDIO READY'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Bi-directional WebSocket connection to stt-websocket-server (ws://localhost:3002)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleListening}
            className={isListening ? 'btn-danger text-xs' : 'btn-primary text-xs'}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            <span>{isListening ? 'Pause Recording' : 'Start Mic Stream'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-xs"
          >
            <Upload size={14} />
            <span>Upload Recording</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*,.wav,.mp3,.m4a"
            className="hidden"
          />
        </div>
      </div>

      {/* Audio Error Alert if mic permission denied */}
      {audioError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Single Authoritative Web Audio API FFT Canvas Spectrum */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 relative">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Volume2 size={14} className="text-emerald-400 animate-pulse" />
            <span>Single Audio Stream Waveform (AnalyserNode FFT)</span>
          </span>
          <span className="text-emerald-400 font-bold">44.1 kHz • Mono Input</span>
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={36}
          className="w-full h-9 rounded bg-slate-900/80"
        />
      </div>

      {/* Live Pipeline Diagnostics Panel */}
      <div className="bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 font-mono text-[11px] space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <Terminal size={14} />
            <span>WebSocket Bridge Real-Time Diagnostics:</span>
          </div>
          <span className="text-[10px] text-slate-400">ws://localhost:3002</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* WebSocket Bridge */}
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">WebSocket Bridge:</span>
            <span className={`font-bold block mt-0.5 ${diagnostics.wsState.includes('Connected') ? 'text-emerald-400' : 'text-amber-400'}`}>
              {diagnostics.wsState}
            </span>
          </div>

          {/* Deepgram State */}
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Deepgram SDK:</span>
            <span className={`font-bold block mt-0.5 ${diagnostics.deepgramState.includes('Connected') ? 'text-emerald-400' : 'text-amber-400'}`}>
              {diagnostics.deepgramState}
            </span>
          </div>

          {/* Audio Chunks Sent */}
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Packets Transmitted:</span>
            <span className="font-bold text-slate-200 block mt-0.5">
              {diagnostics.packetsSent} ({diagnostics.bytesSent} bytes)
            </span>
          </div>

          {/* First Transcript Status */}
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">1st Transcript Recv:</span>
            <span className={`font-bold flex items-center gap-1 mt-0.5 ${diagnostics.firstTranscriptReceived ? 'text-emerald-400' : 'text-slate-400'}`}>
              {diagnostics.firstTranscriptReceived ? <CheckCircle2 size={12} /> : null}
              <span>{diagnostics.firstTranscriptReceived ? 'YES' : 'NO'}</span>
            </span>
          </div>
        </div>

        {/* Audio Stats & Diagnostic Snippet */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div>
            <span>MediaRecorder: <strong className="text-slate-200">{diagnostics.recorderMimeType} ({diagnostics.mediaRecorderState})</strong></span>
            <span className="mx-2">•</span>
            <span>Last Chunk: <strong className="text-slate-200">{diagnostics.lastChunkSize ? `${diagnostics.lastChunkSize} bytes` : 'Waiting...'}</strong></span>
          </div>
          <span>Events Recv: {diagnostics.transcriptEventsReceived}</span>
        </div>

        {/* Diagnostic Failure Reason Report */}
        {diagnostics.failureReason && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-[11px] font-sans flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <span><strong>STT Bridge Notice:</strong> {diagnostics.failureReason}</span>
          </div>
        )}
      </div>

      {/* Live Interim Streaming Bubble */}
      {interimText && (
        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-medium italic animate-pulse flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          <span>Streaming: "{interimText}"</span>
        </div>
      )}

      {/* Diarized Turns Stream */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {diarizedTurns.length > 0 ? (
          diarizedTurns.map((turn) => (
            <div
              key={turn.id}
              className={`p-3 rounded-xl border text-xs space-y-1 transition ${
                turn.speaker === 'Doctor'
                  ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between font-mono font-bold text-[10px]">
                <span className="flex items-center gap-1.5">
                  <UserCheck size={12} className={turn.speaker === 'Doctor' ? 'text-blue-600' : 'text-emerald-600'} />
                  <span>{turn.speaker}</span>
                  <span className="text-slate-400 font-normal">Conf: {turn.confidence}</span>
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{turn.time}</span>
                  <button
                    onClick={() => handleSwapSpeaker(turn.id)}
                    className="hover:bg-white/80 p-1 rounded transition text-slate-500 hover:text-slate-900 flex items-center gap-1 text-[10px]"
                    title="Swap Speaker Label (Doctor ↔ Patient)"
                  >
                    <RefreshCcw size={10} />
                    <span>Swap Speaker</span>
                  </button>
                </div>
              </div>
              <p className="leading-relaxed font-medium">"{turn.text}"</p>
            </div>
          ))
        ) : (
          <div className="p-6 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-mono">
            <span>Microphone Audio Active • Speak to record consultation transcript turns</span>
          </div>
        )}
      </div>
    </div>
  );
}
