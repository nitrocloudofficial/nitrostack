import { NitroServer } from '../../sdk/nitrostack';
import { telemetryStore } from '../../db/telemetryStore.js';
import { TelemetryFrame } from '../../config/thresholds.js';

const BASELINES = {
  bus_voltage: { mean: 28.0, std: 0.5 },
  battery_temp: { mean: 22.5, std: 2.0 },
  tumbling_rate: { mean: 0.02, std: 0.05 },
  gyro_star_residual: { mean: 0.05, std: 0.1 },
  seu_counter: { mean: 0, std: 1.0 }
};

function calculateNovelty(latest: TelemetryFrame, history: TelemetryFrame[]) {
  const keys = ['bus_voltage', 'battery_temp', 'tumbling_rate', 'gyro_star_residual', 'seu_counter'] as const;
  
  let totalSqZ = 0;
  const zScores: Record<string, number> = {};
  const alpha = Math.min(1.0, history.length / 10);
  
  for (const key of keys) {
    const base = BASELINES[key];
    const rawVal = latest[key];
    const latestVal = typeof rawVal === 'number' && !Number.isNaN(rawVal) ? rawVal : base.mean;
    
    let histMean = base.mean;
    let histStd = base.std;
    
    if (history.length > 0) {
      const vals = history.map(h => {
        const v = h[key];
        return typeof v === 'number' && !Number.isNaN(v) ? v : base.mean;
      });
      const sum = vals.reduce((a, b) => a + b, 0);
      histMean = sum / vals.length;
      
      const sqDiffs = vals.map(v => Math.pow(v - histMean, 2));
      const variance = sqDiffs.reduce((a, b) => a + b, 0) / vals.length;
      histStd = Math.sqrt(variance);
    }
    
    const blendedMean = alpha * histMean + (1 - alpha) * base.mean;
    const blendedStd = Math.sqrt(alpha * Math.pow(histStd, 2) + (1 - alpha) * Math.pow(base.std, 2)) || 0.01;
    
    const z = blendedStd > 0 ? (latestVal - blendedMean) / blendedStd : 0;
    const safeZ = Number.isNaN(z) ? 0 : z;
    zScores[key] = parseFloat(safeZ.toFixed(4));
    totalSqZ += safeZ * safeZ;
  }
  
  const distance = Math.sqrt(totalSqZ);
  // Sigmoid scaling: maps distance to a [0, 1] range.
  // 5 degrees of freedom mean distance is ~2.1.
  // Threshold = 3.0, scale = 1.0.
  const noveltyScore = 1 / (1 + Math.exp(-(distance - 3.0) / 1.0));
  
  return {
    noveltyScore,
    distance,
    zScores
  };
}

export function registerAnomalyModule(server: NitroServer) {
  server.registerTool({
    name: 'simulate_scenario',
    description: 'Simulates satellite fault scenarios (space_weather, sensor_fault, true_anomaly, adcs_tumble).',
    parameters: {
      type: 'object',
      properties: {
        scenario_type: {
          type: 'string',
          enum: ['space_weather', 'sensor_fault', 'true_anomaly', 'adcs_tumble']
        }
      },
      required: ['scenario_type']
    },
    handler: async (args: { scenario_type: string }) => {
      switch (args.scenario_type) {
        case 'space_weather':
          return {
            scenario: 'SAA Radiation Belt Crossing',
            telemetry: {
              bus_voltage: 28.1,
              battery_temp: 24.5,
              tumbling_rate: 0.05,
              gyro_star_residual: 0.72,
              seu_counter: 14,
              is_saa_crossing: true,
              satellite_id: 'SAT-ALPHA-1'
            },
            expected_result: 'Space-Weather Glitch -> Continue Mission'
          };
        case 'sensor_fault':
          return {
            scenario: 'Gyroscope Channel Bias Drift',
            telemetry: {
              bus_voltage: 28.0,
              battery_temp: 22.1,
              tumbling_rate: 0.12,
              gyro_star_residual: 1.15,
              seu_counter: 0,
              is_saa_crossing: false,
              satellite_id: 'SAT-ALPHA-1'
            },
            expected_result: 'Sensor Fault -> Isolate Sensor'
          };
        case 'true_anomaly':
          return {
            scenario: 'Battery Thermal Runaway / Bus Drop',
            telemetry: {
              bus_voltage: 20.4,
              battery_temp: 58.2,
              tumbling_rate: 12.4,
              gyro_star_residual: 2.1,
              seu_counter: 1,
              is_saa_crossing: false,
              satellite_id: 'SAT-ALPHA-1'
            },
            expected_result: 'True Anomaly -> Immediate Safe Mode'
          };
        case 'adcs_tumble':
          return {
            scenario: 'Reaction Wheel Saturation / High Tumbling Rate',
            telemetry: {
              bus_voltage: 27.5,
              battery_temp: 31.0,
              tumbling_rate: 14.8,
              gyro_star_residual: 0.95,
              seu_counter: 0,
              is_saa_crossing: false,
              satellite_id: 'SAT-ALPHA-1'
            },
            expected_result: 'True Anomaly -> Immediate Safe Mode'
          };
        default:
          throw new Error('Unknown scenario type');
      }
    }
  });

  server.registerTool({
    name: 'detect_novelty_anomaly',
    description: 'Runs density-based anomaly detector for telemetry features out of distribution.',
    parameters: {
      type: 'object',
      properties: {
        sample_window: { type: 'number', description: 'Number of past telemetry frames to evaluate' }
      }
    },
    handler: async (args: { sample_window?: number }) => {
      const windowSize = args.sample_window || 10;
      const history = telemetryStore.getHistory(windowSize);
      const latest = telemetryStore.getCurrentTelemetry();
      
      const { noveltyScore, distance, zScores } = calculateNovelty(
        latest,
        history.map(h => h.telemetry)
      );
      
      const anomalies = telemetryStore.getAnomalyEvents();

      return {
        evaluated_frames: history.length,
        detected_anomalies: anomalies.length,
        novelty_score: parseFloat(noveltyScore.toFixed(4)),
        mahalanobis_distance: parseFloat(distance.toFixed(4)),
        z_scores: zScores,
        status: noveltyScore > 0.5 ? 'ANOMALOUS_PATTERN_DETECTED' : 'PATTERN_NOMINAL',
        recent_anomalies: anomalies.slice(0, 5)
      };
    }
  });

  server.registerTool({
    name: 'export_training_dataset',
    description: 'Exports labeled anomaly history dataset for ground-based ML model retraining.',
    parameters: {
      type: 'object',
      properties: {
        min_confidence: { type: 'number', description: 'Minimum evaluation confidence to include (0.0 to 1.0)' },
        satellite_id: { type: 'string', description: 'Filter dataset by specific satellite identifier' }
      }
    },
    handler: async (args: { min_confidence?: number; satellite_id?: string }) => {
      const minConfidence = args.min_confidence ?? 0.0;
      const satelliteId = args.satellite_id;
      
      let events = telemetryStore.getAnomalyEvents();
      
      if (satelliteId) {
        events = events.filter(e => e.telemetry.satellite_id === satelliteId);
      }
      
      events = events.filter(e => e.confidence >= minConfidence);
      
      const dataset = events.map(e => ({
        timestamp: e.timestamp,
        satellite_id: e.telemetry.satellite_id,
        features: {
          bus_voltage: e.telemetry.bus_voltage,
          battery_temp: e.telemetry.battery_temp,
          tumbling_rate: e.telemetry.tumbling_rate,
          gyro_star_residual: e.telemetry.gyro_star_residual,
          seu_counter: e.telemetry.seu_counter,
          is_saa_crossing: e.telemetry.is_saa_crossing
        },
        label: {
          class: e.class,
          decision: e.decision,
          confidence: e.confidence
        }
      }));
      
      return {
        satellite_id: satelliteId || 'ALL',
        sample_count: dataset.length,
        exported_at: new Date().toISOString(),
        dataset: dataset,
        schema: {
          features: ['bus_voltage', 'battery_temp', 'tumbling_rate', 'gyro_star_residual', 'seu_counter', 'is_saa_crossing'],
          classes: ['Nominal', 'Space-Weather Glitch', 'Sensor Fault', 'True Anomaly'],
          decisions: ['NOMINAL', 'CONTINUE_MISSION', 'ISOLATE_SENSOR', 'SAFE_MODE']
        }
      };
    }
  });
}
