import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { SemanticScholarService } from '../../core/services/semantic-scholar.service.js';
import {
  TechnicalParams,
} from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 8: Technical Parameter Extractor (Stretch, for engineering topics)
 *
 * Extracts detailed technical parameters from papers (sensors, sampling rates, hardware, etc.)
 */
@Injectable({ deps: [MemoryStore, SemanticScholarService] })
export class TechParamsTools {
  constructor(
    private memory: MemoryStore,
    private semanticScholar: SemanticScholarService
  ) {}

  @Tool({
    name: 'extract_technical_parameters',
    description: 'Extract detailed technical parameters from a paper full text',
    inputSchema: z.object({
      paperId: z.string().describe('Paper ID'),
      fullText: z.string().describe('Full paper text'),
      sessionId: z.string().optional().describe('Session ID to store results'),
    }),
    invocation: {
      invoking: 'Extracting technical parameters from paper...',
      invoked: 'Technical parameter extraction complete'
    },
    examples: {
      request: { paperId: 'p1', fullText: 'We use 8x A100 GPUs with NVLink. The accelerometer samples at 100 Hz. Dataset contains 10,000 samples.' },
      response: { paramsId: 'tp1', paperId: 'p1', sensors: ['accelerometer'], samplingRateHz: 100, datasetSize: 10000, hardwarePlatform: 'GPU', powerBudgetMw: undefined, latencyMs: undefined, throughput: undefined, extractedAt: '2026-07-26T10:00:00Z' }
    }
  })
  @Widget('research-pilot-shell')
  async extractTechnicalParameters(
    input: { paperId: string; fullText: string; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { paperId, fullText, sessionId } = input;

    ctx.logger.info('Extracting technical parameters', { paperId });

    const params = this.extractParams(fullText, paperId);

    if (sessionId) {
      this.memory.addTechnicalParams(sessionId, [params]);
    }

    return params;
  }

  private extractParams(text: string, paperId: string): TechnicalParams {
    const lower = text.toLowerCase();

    // Sensors
    const sensors: string[] = [];
    const sensorKeywords = [
      'accelerometer', 'gyroscope', 'ecg', 'eeg', 'emg', 'ppg',
      'camera', 'lidar', 'radar', 'microphone', 'thermometer',
      'pressure sensor', 'temperature sensor', 'force sensor',
      'inertial measurement unit', 'imu', 'gps', 'magnetic sensor',
      'proximity sensor', 'ultrasonic', 'infrared', 'rgb-d',
    ];
    for (const kw of sensorKeywords) {
      if (lower.includes(kw)) sensors.push(kw);
    }

    // Sampling rate
    let samplingRateHz: number | undefined;
    const srMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:Hz|kHz|MHz|GHz)/i);
    if (srMatch) {
      const val = parseFloat(srMatch[1]);
      const unit = srMatch[0].toLowerCase();
      if (unit.includes('khz')) samplingRateHz = val * 1000;
      else if (unit.includes('mhz')) samplingRateHz = val * 1000000;
      else if (unit.includes('ghz')) samplingRateHz = val * 1000000000;
      else samplingRateHz = val;
    }

    // Dataset size
    let datasetSize: number | undefined;
    const dsMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:samples|images|recordings|examples|patients|participants|subjects|frames)/i);
    if (dsMatch) {
      datasetSize = parseInt(dsMatch[1].replace(/,/g, ''), 10);
    }

    // Hardware platform
    const hardwareKeywords = ['fpga', 'asic', 'gpu', 'cpu', 'tpu', 'microcontroller', 'mcu', 'raspberry pi', 'arduino', 'jetson', 'edge device', 'mobile', 'embedded'];
    let hardwarePlatform: string | undefined;
    for (const kw of hardwareKeywords) {
      if (lower.includes(kw)) {
        hardwarePlatform = kw.toUpperCase();
        break;
      }
    }

    // Power budget
    let powerBudgetMw: number | undefined;
    const pwrMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mW|milliwatt|μW|uW|W)/i);
    if (pwrMatch) {
      const val = parseFloat(pwrMatch[1]);
      const unit = pwrMatch[0].toLowerCase();
      if (unit.includes('μw') || unit.includes('uw')) powerBudgetMw = val / 1000;
      else if (unit === 'w') powerBudgetMw = val * 1000;
      else powerBudgetMw = val;
    }

    // Latency
    let latencyMs: number | undefined;
    const latMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ms|millisecond)/i);
    if (latMatch) latencyMs = parseFloat(latMatch[1]);

    // Throughput
    let throughput: string | undefined;
    const tpMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:fps|frames per second|samples per second|Hz)/i);
    if (tpMatch) throughput = `${tpMatch[1]} ${tpMatch[2]}`;

    return {
      paramsId: generateId('params'),
      paperId,
      sensors: [...new Set(sensors)],
      samplingRateHz,
      datasetSize,
      hardwarePlatform,
      powerBudgetMw,
      latencyMs,
      throughput,
      other: {},
      extractedAt: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'compare_technical_parameters',
    description: 'Compare technical parameters across papers',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID'),
    }),
    invocation: {
      invoking: 'Comparing technical parameters across papers...',
      invoked: 'Technical parameter comparison complete'
    },
    examples: {
      request: { sessionId: 'sess_001' },
      response: { sessionId: 'sess_001', paperCount: 3, sensors: ['accelerometer', 'gyroscope'], hasSamplingRate: true, hasDatasetSize: true, hasPowerBudget: false, platforms: ['GPU', 'FPGA'], parameters: [] }
    }
  })
  @Widget('research-pilot-shell')
  async compareTechnicalParameters(
    input: { sessionId: string },
    ctx: ExecutionContext
  ) {
    const { sessionId } = input;

    const allParams = this.memory.getTechnicalParams(sessionId);

    if (allParams.length === 0) {
      return { sessionId, parameterCount: 0, message: 'No technical parameters extracted yet' };
    }

    // Group by parameter type
    const sensors = new Set<string>();
    let hasSamplingRate = false;
    let hasDatasetSize = false;
    let hasPowerBudget = false;
    const platforms = new Set<string>();

    for (const params of allParams) {
      params.sensors.forEach(s => sensors.add(s));
      if (params.samplingRateHz) hasSamplingRate = true;
      if (params.datasetSize) hasDatasetSize = true;
      if (params.powerBudgetMw) hasPowerBudget = true;
      if (params.hardwarePlatform) platforms.add(params.hardwarePlatform);
    }

    return {
      sessionId,
      paperCount: [...new Set(allParams.map(p => p.paperId))].length,
      sensors: Array.from(sensors),
      hasSamplingRate,
      hasDatasetSize,
      hasPowerBudget,
      platforms: Array.from(platforms),
      parameters: allParams,
    };
  }

  @Tool({
    name: 'fetch_and_extract_tech_params',
    description: 'Fetch full text and extract technical parameters in one call',
    inputSchema: z.object({
      paperId: z.string().describe('Semantic Scholar paper ID'),
      sessionId: z.string().optional().describe('Session ID to store results'),
    }),
    invocation: {
      invoking: 'Fetching full text and extracting technical parameters...',
      invoked: 'Full text fetched and technical parameters extracted'
    },
    examples: {
      request: { paperId: 'p123', sessionId: 'sess_001' },
      response: { paramsId: 'tp1', paperId: 'p123', sensors: ['accelerometer'], samplingRateHz: 100, datasetSize: 10000, hardwarePlatform: 'GPU', powerBudgetMw: undefined, latencyMs: undefined, throughput: undefined, extractedAt: '2026-07-26T10:00:00Z' }
    }
  })
  @Widget('research-pilot-shell')
  async fetchAndExtractTechParams(
    input: { paperId: string; sessionId?: string },
    ctx: ExecutionContext
  ) {
    const { paperId, sessionId } = input;

    ctx.logger.info('Fetching and extracting tech params', { paperId });

    // Fetch full text
    const fetchResult = await this.semanticScholar.getPaper(paperId);
    if (!fetchResult?.isOpenAccess || !fetchResult.pdfUrl) {
      throw new Error(`Paper ${paperId} not open access or no PDF URL`);
    }

    // Fetch PDF and parse
    const response = await fetch(fetchResult.pdfUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);

    if (!data.text || data.text.length < 100) {
      throw new Error('Could not extract text from PDF');
    }

    // Extract parameters
    return this.extractTechnicalParameters({
      paperId,
      fullText: data.text,
      sessionId,
    }, ctx);
  }
}