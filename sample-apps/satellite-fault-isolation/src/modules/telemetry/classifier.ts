export interface TelemetryFeatureVector {
  bus_voltage: number;
  battery_temp: number;
  tumbling_rate: number;
  gyro_star_residual: number;
  seu_counter: number;
  is_saa_crossing: number; // 0 or 1
  gyro_persistence_count: number;
}

export type AnomalyClass = 'Nominal' | 'Space-Weather Glitch' | 'Sensor Fault' | 'True Anomaly';

export interface PredictionResult {
  label: AnomalyClass;
  confidence: number;
}

interface TreeNode {
  isLeaf: boolean;
  label?: AnomalyClass;
  confidence?: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export class TelemetryDecisionTree {
  private root: TreeNode | null = null;
  private featureNames: string[] = [
    'bus_voltage',
    'battery_temp',
    'tumbling_rate',
    'gyro_star_residual',
    'seu_counter',
    'is_saa_crossing',
    'gyro_persistence_count'
  ];

  public train(samples: { features: TelemetryFeatureVector; label: AnomalyClass }[]): void {
    const data = samples.map(s => ({
      x: [
        s.features.bus_voltage,
        s.features.battery_temp,
        s.features.tumbling_rate,
        s.features.gyro_star_residual,
        s.features.seu_counter,
        s.features.is_saa_crossing,
        s.features.gyro_persistence_count
      ],
      y: s.label
    }));

    this.root = this.buildTree(data, 0, 5); // max depth 5
  }

  private buildTree(
    data: { x: number[]; y: AnomalyClass }[],
    depth: number,
    maxDepth: number
  ): TreeNode {
    const labels = data.map(d => d.y);
    const uniqueLabels = Array.from(new Set(labels));
    if (uniqueLabels.length === 1) {
      return { isLeaf: true, label: uniqueLabels[0], confidence: 1.0 };
    }

    const majority = this.majorityLabelWithConfidence(labels);

    if (depth >= maxDepth || data.length < 2) {
      return { isLeaf: true, label: majority.label, confidence: majority.confidence };
    }

    let bestGini = 1.0;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeft: typeof data = [];
    let bestRight: typeof data = [];

    const numFeatures = data[0].x.length;
    for (let f = 0; f < numFeatures; f++) {
      const values = Array.from(new Set(data.map(d => d.x[f])));
      for (const val of values) {
        const left = data.filter(d => d.x[f] <= val);
        const right = data.filter(d => d.x[f] > val);

        if (left.length === 0 || right.length === 0) continue;

        const gini = this.calculateSplitGini(left.map(d => d.y), right.map(d => d.y));
        if (gini < bestGini) {
          bestGini = gini;
          bestFeature = f;
          bestThreshold = val;
          bestLeft = left;
          bestRight = right;
        }
      }
    }

    if (bestFeature === -1) {
      return { isLeaf: true, label: majority.label, confidence: majority.confidence };
    }

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      left: this.buildTree(bestLeft, depth + 1, maxDepth),
      right: this.buildTree(bestRight, depth + 1, maxDepth),
    };
  }

  private majorityLabelWithConfidence(labels: AnomalyClass[]): { label: AnomalyClass; confidence: number } {
    if (labels.length === 0) {
      return { label: 'Nominal', confidence: 1.0 };
    }
    const counts: Record<string, number> = {};
    let maxCount = 0;
    let majority: AnomalyClass = 'Nominal';
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
      if (counts[label] > maxCount) {
        maxCount = counts[label];
        majority = label;
      }
    }
    const confidence = parseFloat((maxCount / labels.length).toFixed(4));
    return { label: majority, confidence };
  }

  private calculateGini(labels: AnomalyClass[]): number {
    const total = labels.length;
    if (total === 0) return 0;
    const counts: Record<string, number> = {};
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
    let sumSqProb = 0;
    for (const label in counts) {
      const prob = counts[label] / total;
      sumSqProb += prob * prob;
    }
    return 1.0 - sumSqProb;
  }

  private calculateSplitGini(left: AnomalyClass[], right: AnomalyClass[]): number {
    const total = left.length + right.length;
    return (left.length / total) * this.calculateGini(left) + (right.length / total) * this.calculateGini(right);
  }

  public predictWithConfidence(features: TelemetryFeatureVector): PredictionResult {
    if (!this.root) return { label: 'Nominal', confidence: 1.0 };
    let current = this.root;
    const x = [
      features.bus_voltage,
      features.battery_temp,
      features.tumbling_rate,
      features.gyro_star_residual,
      features.seu_counter,
      features.is_saa_crossing,
      features.gyro_persistence_count
    ];

    while (!current.isLeaf) {
      const f = current.featureIndex!;
      const t = current.threshold!;
      if (x[f] <= t) {
        current = current.left!;
      } else {
        current = current.right!;
      }
    }
    return {
      label: current.label || 'Nominal',
      confidence: current.confidence !== undefined ? current.confidence : 1.0
    };
  }

  public predict(features: TelemetryFeatureVector): AnomalyClass {
    return this.predictWithConfidence(features).label;
  }
}

export function generateTrainingData(): { features: TelemetryFeatureVector; label: AnomalyClass }[] {
  const samples: { features: TelemetryFeatureVector; label: AnomalyClass }[] = [];

  const voltagesNormal = [24.0, 26.0, 28.0, 30.0];
  const tempsNormal = [15.0, 20.0, 30.0, 45.0];
  const tumblingNormal = [0.02, 0.05, 0.1, 0.5, 2.0];
  const residualsNormal = [0.01, 0.05, 0.1, 0.3];
  const residualsHigh = [0.6, 0.9, 1.2, 1.5];

  const seuNormal = [0, 1, 2];
  const saaNormal = [0, 1];
  const persistenceNormal = [0, 1];

  // 1. Generate Nominals
  for (const v of voltagesNormal) {
    for (const t of tempsNormal) {
      for (const tumbling of tumblingNormal) {
        for (const res of residualsNormal) {
          for (const seu of seuNormal) {
            for (const saa of saaNormal) {
              for (const p of persistenceNormal) {
                samples.push({
                  features: {
                    bus_voltage: v,
                    battery_temp: t,
                    tumbling_rate: tumbling,
                    gyro_star_residual: res,
                    seu_counter: seu,
                    is_saa_crossing: saa,
                    gyro_persistence_count: p
                  },
                  label: 'Nominal'
                });
              }
            }
          }
        }
      }
    }
  }

  // 2. Generate Space Weather Glitches (high residual, in SAA, non-persistent, high SEU counter)
  for (const v of voltagesNormal) {
    for (const t of tempsNormal) {
      for (const tumbling of tumblingNormal) {
        for (const res of residualsHigh) {
          for (const seu of [6, 12, 20]) {
            for (const persistence of [1, 2]) {
              samples.push({
                features: {
                  bus_voltage: v,
                  battery_temp: t,
                  tumbling_rate: tumbling,
                  gyro_star_residual: res,
                  seu_counter: seu,
                  is_saa_crossing: 1,
                  gyro_persistence_count: persistence
                },
                label: 'Space-Weather Glitch'
              });
            }
          }
        }
      }
    }
  }

  // 3. Generate Sensor Faults
  // 3a. High residual outside SAA (regardless of persistence)
  for (const v of voltagesNormal) {
    for (const t of tempsNormal) {
      for (const tumbling of tumblingNormal) {
        for (const res of residualsHigh) {
          for (const seu of [0, 2, 8]) {
            for (const persistence of [1, 2]) {
              samples.push({
                features: {
                  bus_voltage: v,
                  battery_temp: t,
                  tumbling_rate: tumbling,
                  gyro_star_residual: res,
                  seu_counter: seu,
                  is_saa_crossing: 0,
                  gyro_persistence_count: persistence
                },
                label: 'Sensor Fault'
              });
            }
          }
        }
      }
    }
  }
  // 3b. High residual inside SAA but persistent (persistence >= 3)
  for (const v of voltagesNormal) {
    for (const t of tempsNormal) {
      for (const tumbling of tumblingNormal) {
        for (const res of residualsHigh) {
          for (const seu of [8, 12, 18]) {
            for (const persistence of [3, 4]) {
              samples.push({
                features: {
                  bus_voltage: v,
                  battery_temp: t,
                  tumbling_rate: tumbling,
                  gyro_star_residual: res,
                  seu_counter: seu,
                  is_saa_crossing: 1,
                  gyro_persistence_count: persistence
                },
                label: 'Sensor Fault'
              });
            }
          }
        }
      }
    }
  }

  // 4. Generate True Anomalies (exceeding hard thresholds or physical boundaries)
  // 4a. Low voltage (< 22V) with varied temp, tumbling, residual, etc.
  for (const v of [12.0, 15.0, 18.0, 20.0, 21.5]) {
    for (const t of tempsNormal) {
      for (const tumbling of tumblingNormal) {
        for (const res of residualsNormal) {
          for (const seu of seuNormal) {
            for (const saa of saaNormal) {
              for (const p of persistenceNormal) {
                samples.push({
                  features: {
                    bus_voltage: v,
                    battery_temp: t,
                    tumbling_rate: tumbling,
                    gyro_star_residual: res,
                    seu_counter: seu,
                    is_saa_crossing: saa,
                    gyro_persistence_count: p
                  },
                  label: 'True Anomaly'
                });
              }
            }
          }
        }
      }
    }
  }

  // 4b. High temp (> 55°C) with varied voltage, tumbling, residual, etc.
  for (const t of [56.0, 60.0, 65.0, 75.0]) {
    for (const v of voltagesNormal) {
      for (const tumbling of tumblingNormal) {
        for (const res of residualsNormal) {
          for (const seu of seuNormal) {
            for (const saa of saaNormal) {
              for (const p of persistenceNormal) {
                samples.push({
                  features: {
                    bus_voltage: v,
                    battery_temp: t,
                    tumbling_rate: tumbling,
                    gyro_star_residual: res,
                    seu_counter: seu,
                    is_saa_crossing: saa,
                    gyro_persistence_count: p
                  },
                  label: 'True Anomaly'
                });
              }
            }
          }
        }
      }
    }
  }

  // 4c. High tumbling (> 10°/s) with varied voltage, temp, residual, etc.
  for (const tumbling of [10.5, 12.0, 15.0, 20.0]) {
    for (const v of voltagesNormal) {
      for (const t of tempsNormal) {
        for (const res of residualsNormal) {
          for (const seu of seuNormal) {
            for (const saa of saaNormal) {
              for (const p of persistenceNormal) {
                samples.push({
                  features: {
                    bus_voltage: v,
                    battery_temp: t,
                    tumbling_rate: tumbling,
                    gyro_star_residual: res,
                    seu_counter: seu,
                    is_saa_crossing: saa,
                    gyro_persistence_count: p
                  },
                  label: 'True Anomaly'
                });
              }
            }
          }
        }
      }
    }
  }

  return samples;
}

export interface EvaluationReport {
  trainCount: number;
  testCount: number;
  trainAccuracy: number;
  testAccuracy: number;
  confusionMatrix: Record<AnomalyClass, Record<AnomalyClass, number>>;
}

export function evaluateModel(
  samples: { features: TelemetryFeatureVector; label: AnomalyClass }[],
  trainRatio = 0.8
): EvaluationReport {
  const classes: AnomalyClass[] = ['Nominal', 'Space-Weather Glitch', 'Sensor Fault', 'True Anomaly'];
  
  const samplesByClass: Record<AnomalyClass, typeof samples> = {
    'Nominal': [],
    'Space-Weather Glitch': [],
    'Sensor Fault': [],
    'True Anomaly': []
  };

  for (const s of samples) {
    samplesByClass[s.label].push(s);
  }

  const trainSamples: typeof samples = [];
  const testSamples: typeof samples = [];

  for (const cls of classes) {
    const list = samplesByClass[cls];
    const trainCut = Math.floor(list.length * trainRatio);
    trainSamples.push(...list.slice(0, trainCut));
    testSamples.push(...list.slice(trainCut));
  }

  const model = new TelemetryDecisionTree();
  model.train(trainSamples);

  let trainCorrect = 0;
  for (const s of trainSamples) {
    if (model.predict(s.features) === s.label) trainCorrect++;
  }
  const trainAccuracy = parseFloat((trainCorrect / trainSamples.length).toFixed(4));

  const confusionMatrix: Record<AnomalyClass, Record<AnomalyClass, number>> = {
    'Nominal': { 'Nominal': 0, 'Space-Weather Glitch': 0, 'Sensor Fault': 0, 'True Anomaly': 0 },
    'Space-Weather Glitch': { 'Nominal': 0, 'Space-Weather Glitch': 0, 'Sensor Fault': 0, 'True Anomaly': 0 },
    'Sensor Fault': { 'Nominal': 0, 'Space-Weather Glitch': 0, 'Sensor Fault': 0, 'True Anomaly': 0 },
    'True Anomaly': { 'Nominal': 0, 'Space-Weather Glitch': 0, 'Sensor Fault': 0, 'True Anomaly': 0 }
  };

  let testCorrect = 0;
  for (const s of testSamples) {
    const pred = model.predict(s.features);
    confusionMatrix[s.label][pred]++;
    if (pred === s.label) testCorrect++;
  }
  const testAccuracy = parseFloat((testCorrect / testSamples.length).toFixed(4));

  return {
    trainCount: trainSamples.length,
    testCount: testSamples.length,
    trainAccuracy,
    testAccuracy,
    confusionMatrix
  };
}
