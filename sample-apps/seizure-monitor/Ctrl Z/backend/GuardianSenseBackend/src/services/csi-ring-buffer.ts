const MAX_SAMPLES = 60;

export interface CsiSample {
  timestamp: number;
  amplitudes: number[];
}

const buffer: CsiSample[] = [];

export function pushCsiSample(csi: number[]): void {
  if (!csi || csi.length === 0) {
    return;
  }

  const amplitudes = csi.map((v) => Math.abs(v));
  buffer.push({ timestamp: Date.now(), amplitudes });

  while (buffer.length > MAX_SAMPLES) {
    buffer.shift();
  }
}

export function getCsiRingBuffer(): CsiSample[] {
  return [...buffer];
}

export function getLatestCsiAmplitudes(): number[] {
  const latest = buffer[buffer.length - 1];
  return latest ? latest.amplitudes : [];
}
