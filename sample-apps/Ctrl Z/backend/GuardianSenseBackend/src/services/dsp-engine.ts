export interface CsiPacket {
  timestamp: string;
  amplitude: number[];
  phase: number[];
}

export interface DspResult {
  amplitudeMean: number;
  phaseMean: number;
  signalStrength: number;
}

export class DSPEngine {

  process(packet: CsiPacket): DspResult {

    const amplitudeMean =
      packet.amplitude.reduce((a, b) => a + b, 0) /
      packet.amplitude.length;

    const phaseMean =
      packet.phase.reduce((a, b) => a + b, 0) /
      packet.phase.length;

    return {
      amplitudeMean,
      phaseMean,
      signalStrength: amplitudeMean
    };
  }

}