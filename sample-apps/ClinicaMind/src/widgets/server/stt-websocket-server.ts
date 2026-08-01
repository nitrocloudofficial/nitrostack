import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3002;
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 [ClinicaMind STT WebSocket Server] Listening on ws://localhost:${PORT}`);

wss.on('connection', (clientWs: WebSocket) => {
  console.log('📡 [STT WS Server]: Client connected from browser');

  const apiKey = process.env.DEEPGRAM_API_KEY || process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    const errorMsg = 'DEEPGRAM_API_KEY is not defined in server environment variables. Please add DEEPGRAM_API_KEY to your .env.local file.';
    console.error('❌ [STT WS Server Error]:', errorMsg);
    clientWs.send(JSON.stringify({ type: 'error', message: errorMsg }));
    clientWs.close();
    return;
  }

  // 1. Create Official Deepgram Client
  console.log('🔑 [STT WS Server]: Deepgram client created');
  const deepgram = createClient(apiKey.trim());

  // 2. Initiate Deepgram Live Transcription Connection
  console.log('🌐 [STT WS Server]: Deepgram connecting...');
  const dgConnection = deepgram.listen.live({
    model: 'nova-2-medical',
    smart_format: true,
    diarize: true,
    interim_results: true,
    punctuate: true
  });

  let isDgOpen = false;
  const chunkQueue: Buffer[] = [];
  let packetsCount = 0;
  let bytesCount = 0;

  // Helper to convert Node Buffer to ArrayBuffer for Deepgram SDK send()
  const sendBufferToDg = (buf: Buffer) => {
    const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    dgConnection.send(arrayBuf);
  };

  // 3. Deepgram SDK Lifecycle Event Listeners
  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    isDgOpen = true;
    console.log('✅ [STT WS Server]: Deepgram connected');
    clientWs.send(JSON.stringify({ type: 'status', message: 'Deepgram Connected' }));

    // Flush any audio chunks received while Deepgram connection was establishing
    console.log(`🚀 [STT WS Server]: Flushing ${chunkQueue.length} queued audio chunks to Deepgram...`);
    while (chunkQueue.length > 0) {
      const chunk = chunkQueue.shift();
      if (chunk) {
        try {
          sendBufferToDg(chunk);
          packetsCount += 1;
          bytesCount += chunk.length;
          console.log(`📦 [STT WS Server]: Queued packet forwarded (${chunk.length} bytes)`);
        } catch (e) {
          console.warn('Error sending queued chunk:', e);
        }
      }
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
    console.log('📩 [STT WS Server]: Transcript received from Deepgram');
    const channel = data.channel;
    const transcript = channel?.alternatives?.[0]?.transcript;

    if (transcript && transcript.trim().length > 0) {
      const words = channel?.alternatives?.[0]?.words || [];
      const speakerId = words[0]?.speaker !== undefined ? words[0].speaker : 0;
      const speakerLabel = speakerId === 0 ? 'Doctor' : 'Patient';
      const isFinal = Boolean(data.is_final);
      const confidence = channel?.alternatives?.[0]?.confidence || 0.95;

      const payload = {
        type: 'transcript',
        text: transcript.trim(),
        isFinal,
        speaker: speakerLabel,
        confidence: parseFloat(confidence.toFixed(2)),
        rawJsonSnippet: JSON.stringify(data).substring(0, 150)
      };

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
        console.log(`📤 [STT WS Server]: Transcript forwarded to browser: "${transcript.trim()}" (Final: ${isFinal})`);
      }
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('❌ [STT WS Server]: Deepgram connection error:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Deepgram Live Error' }));
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log('🚪 [STT WS Server]: Deepgram connection closed');
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'close', message: 'Deepgram Connection Closed' }));
    }
  });

  // 4. Handle Audio Chunks Received from Browser WebSocket
  clientWs.on('message', (data: Buffer | ArrayBuffer) => {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

    if (buffer.length > 0) {
      if (isDgOpen) {
        try {
          sendBufferToDg(buffer);
          packetsCount += 1;
          bytesCount += buffer.length;
          console.log(`📦 [STT WS Server]: Packet forwarded (${buffer.length} bytes, total: ${packetsCount})`);
        } catch (err) {
          console.warn('Error forwarding chunk to Deepgram:', err);
        }
      } else {
        console.log(`⏳ [STT WS Server]: Deepgram not open yet. Queuing chunk (${buffer.length} bytes)...`);
        chunkQueue.push(buffer);
      }
    }
  });

  clientWs.on('close', () => {
    console.log('🚪 [STT WS Server]: Browser client disconnected');
    try {
      dgConnection.finish();
    } catch (e) {}
  });

  clientWs.on('error', (err) => {
    console.error('❌ [STT WS Server]: Browser client socket error:', err);
  });
});
