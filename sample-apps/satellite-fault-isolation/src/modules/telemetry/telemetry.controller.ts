import { NitroServer } from '../../sdk/nitrostack';
import { DEFAULT_THRESHOLDS, TelemetryFrame, EvaluationResult } from '../../config/thresholds.js';
import { telemetryStore } from '../../db/telemetryStore.js';
import { TelemetryDecisionTree, generateTrainingData, evaluateModel } from './classifier.js';

// Initialize, evaluate, and train the Decision Tree classifier at startup
const dataset = generateTrainingData();
const evalReport = evaluateModel(dataset, 0.8);
console.log(`[TelemetryClassifier] Model evaluation split: ${evalReport.trainCount} train, ${evalReport.testCount} test samples.`);
console.log(`[TelemetryClassifier] Train Accuracy: ${(evalReport.trainAccuracy * 100).toFixed(1)}%, Held-out Test Accuracy: ${(evalReport.testAccuracy * 100).toFixed(1)}%`);
console.log('[TelemetryClassifier] Test Confusion Matrix:', JSON.stringify(evalReport.confusionMatrix, null, 2));

const classifier = new TelemetryDecisionTree();
classifier.train(dataset);

export function registerTelemetryModule(server: NitroServer) {
  server.registerTool({
    name: 'evaluate_telemetry',
    description: 'Evaluates satellite telemetry frame through safety envelope, space-weather filter, and sensor isolation.',
    parameters: {
      type: 'object',
      properties: {
        bus_voltage: { type: 'number', description: 'Main bus voltage (V)' },
        battery_temp: { type: 'number', description: 'Battery temperature (C)' },
        tumbling_rate: { type: 'number', description: 'ADCS tumbling rate (deg/s)' },
        gyro_star_residual: { type: 'number', description: 'Gyroscope vs Star Tracker residual' },
        seu_counter: { type: 'number', description: 'Single Event Upset counter' },
        is_saa_crossing: { type: 'boolean', description: 'Whether satellite is crossing South Atlantic Anomaly' },
        satellite_id: { type: 'string', description: 'Satellite ID designation' }
      },
      required: ['bus_voltage', 'battery_temp', 'tumbling_rate', 'gyro_star_residual', 'seu_counter', 'is_saa_crossing']
    },
    handler: async (args: TelemetryFrame) => {
      const timestamp = new Date().toISOString();
      const satId = args.satellite_id || 'SAT-ALPHA-1';

      // Input Validation
      const bus_voltage = typeof args.bus_voltage === 'number' && !Number.isNaN(args.bus_voltage) ? args.bus_voltage : 28.0;
      const battery_temp = typeof args.battery_temp === 'number' && !Number.isNaN(args.battery_temp) ? args.battery_temp : 20.0;
      const tumbling_rate = typeof args.tumbling_rate === 'number' && !Number.isNaN(args.tumbling_rate) ? args.tumbling_rate : 0.05;
      const gyro_star_residual = typeof args.gyro_star_residual === 'number' && !Number.isNaN(args.gyro_star_residual) ? args.gyro_star_residual : 0.0;
      const seu_counter = typeof args.seu_counter === 'number' && !Number.isNaN(args.seu_counter) ? args.seu_counter : 0;
      const is_saa_crossing = Boolean(args.is_saa_crossing);

      const currentFrame: TelemetryFrame = {
        bus_voltage,
        battery_temp,
        tumbling_rate,
        gyro_star_residual,
        seu_counter,
        is_saa_crossing,
        timestamp,
        satellite_id: satId
      };

      // 🔴 HARD SAFETY ENVELOPE: Non-bypassable first stage check
      if (
        bus_voltage < DEFAULT_THRESHOLDS.min_bus_voltage ||
        battery_temp > DEFAULT_THRESHOLDS.max_battery_temp ||
        tumbling_rate > DEFAULT_THRESHOLDS.max_tumbling_rate
      ) {
        const safetyResult: EvaluationResult = {
          decision: 'SAFE_MODE',
          reason: `Hard Safety Envelope Triggered: Voltage=${bus_voltage}V (min ${DEFAULT_THRESHOLDS.min_bus_voltage}V), Temp=${battery_temp}°C (max ${DEFAULT_THRESHOLDS.max_battery_temp}°C), Tumble=${tumbling_rate}°/s (max ${DEFAULT_THRESHOLDS.max_tumbling_rate}°/s)`,
          class: 'True Anomaly',
          confidence: 1.0,
          action: 'Immediate safing triggered by physical hardware safety limits.',
          timestamp,
          telemetry: currentFrame
        };
        telemetryStore.recordEvaluation(safetyResult);
        return safetyResult;
      }

      const features = telemetryStore.getRollingFeatures(currentFrame);

      // Perform classification using the trained Decision Tree model
      const { label: predictedClass, confidence } = classifier.predictWithConfidence({
        bus_voltage,
        battery_temp,
        tumbling_rate,
        gyro_star_residual,
        seu_counter,
        is_saa_crossing: is_saa_crossing ? 1 : 0,
        gyro_persistence_count: features.gyro_residual_persistence_count
      });

      let result: EvaluationResult;

      switch (predictedClass) {
        case 'True Anomaly':
          result = {
            decision: 'SAFE_MODE',
            reason: 'Anomalous telemetry pattern detected by trained Decision Tree',
            class: 'True Anomaly',
            confidence,
            action: 'Immediate safing triggered by classified anomaly pattern.',
            timestamp,
            telemetry: currentFrame
          };
          break;

        case 'Space-Weather Glitch':
          result = {
            decision: 'CONTINUE_MISSION',
            reason: `Space Weather Glitch predicted by classifier (persistence: ${features.gyro_residual_persistence_count}, rate: ${features.gyro_residual_rate_of_change.toFixed(2)}/s)`,
            class: 'Space-Weather Glitch',
            confidence,
            action: 'Applied transient filter. Deweighted corrupted samples. Safe-mode avoided.',
            timestamp,
            telemetry: currentFrame
          };
          break;

        case 'Sensor Fault':
          result = {
            decision: 'ISOLATE_SENSOR',
            reason: `Sensor fault/drift predicted by classifier (persistence: ${features.gyro_residual_persistence_count}, rate: ${features.gyro_residual_rate_of_change.toFixed(2)}/s)`,
            class: 'Sensor Fault',
            confidence,
            action: 'Switched to redundant Star Tracker ADCS mode. Deweighted primary gyro.',
            timestamp,
            telemetry: currentFrame
          };
          break;

        case 'Nominal':
        default:
          result = {
            decision: 'NOMINAL',
            reason: 'Telemetry classified as Nominal by trained Decision Tree',
            class: 'Nominal',
            confidence,
            action: 'Continue standard payload operations.',
            timestamp,
            telemetry: currentFrame
          };
          break;
      }

      telemetryStore.recordEvaluation(result);
      return result;
    }
  });
}
