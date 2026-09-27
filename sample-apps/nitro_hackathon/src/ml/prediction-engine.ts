/**
 * Prediction Engine — Logistic Regression
 *
 * A simple binary classification model that predicts machine failure
 * based on 6 sensor features from the AI4I 2020 dataset.
 *
 * Algorithm: Logistic Regression (implemented from scratch)
 *   - Why? It's simple, outputs probabilities, and needs zero dependencies.
 *   - How? It learns a weight for each feature, then uses the sigmoid function
 *     to convert a weighted sum into a probability between 0 and 1.
 *
 * This module is a reusable building block — future agents will call
 * the `predict()` function without needing to know the math inside.
 */

import { loadDataset, type MachineRecord } from '../data/dataset.js';

// ── Types ────────────────────────────────────────────────────────

/** The 6 sensor features used as prediction inputs */
export interface PredictionInput {
  type: string;           // Quality type: 'L', 'M', or 'H'
  airTemp: number;        // Air temperature [K]
  processTemp: number;    // Process temperature [K]
  rotationalSpeed: number; // Rotational speed [rpm]
  torque: number;         // Torque [Nm]
  toolWear: number;       // Tool wear [min]
}

/** The prediction result returned to the caller */
export interface PredictionResult {
  prediction: 'failure' | 'no_failure';
  probability: number;    // 0–1 probability of failure
  confidence: number;     // How confident: max(probability, 1 - probability)
  features: PredictionInput;
}

/** Internal model state (weights + normalization parameters) */
interface TrainedModel {
  weights: number[];      // One weight per feature column + 1 bias
  featureMeans: number[]; // Mean of each feature (for normalization)
  featureStds: number[];  // Std deviation of each feature (for normalization)
  trained: boolean;
}

// ── Constants ────────────────────────────────────────────────────

/**
 * Maps the 'Type' field (L, M, H) to a numeric value.
 * L = Low quality (50% of products), M = Medium (30%), H = High (20%)
 *
 * We use simple numeric encoding. For an MVP this works fine.
 * A more advanced approach would use one-hot encoding.
 */
const TYPE_MAP: Record<string, number> = { L: 0, M: 1, H: 2 };

/**
 * Training hyperparameters.
 * These are intentionally conservative for stable training.
 */
const LEARNING_RATE = 0.1;
const ITERATIONS = 1000;

// ── Module State ─────────────────────────────────────────────────

let model: TrainedModel | null = null;

// ── Math Helpers ─────────────────────────────────────────────────

/**
 * Sigmoid function: converts any number into a value between 0 and 1.
 *
 *   sigmoid(x) = 1 / (1 + e^(-x))
 *
 * This is the core of logistic regression — it turns a weighted sum
 * of features into a probability.
 */
function sigmoid(x: number): number {
  // Clamp to avoid overflow in Math.exp
  if (x > 500) return 1;
  if (x < -500) return 0;
  return 1 / (1 + Math.exp(-x));
}

// ── Feature Extraction ───────────────────────────────────────────

/**
 * Convert a PredictionInput into a numeric array of 6 values.
 * This is the format the model works with internally.
 */
function inputToFeatures(input: PredictionInput): number[] {
  return [
    TYPE_MAP[input.type] ?? 0,
    input.airTemp,
    input.processTemp,
    input.rotationalSpeed,
    input.torque,
    input.toolWear,
  ];
}

/**
 * Extract the same 6 features from a full MachineRecord.
 * (Used during training to pull features from the dataset.)
 */
function recordToFeatures(record: MachineRecord): number[] {
  return [
    TYPE_MAP[record.type] ?? 0,
    record.airTemp,
    record.processTemp,
    record.rotationalSpeed,
    record.torque,
    record.toolWear,
  ];
}

// ── Normalization ────────────────────────────────────────────────

/**
 * Compute the mean and standard deviation of each feature column.
 *
 * Why normalize? Without it, features with large values (like rotational
 * speed ~1500) would dominate features with small values (like type 0–2).
 * Normalization puts all features on the same scale.
 */
function computeNormalization(featureRows: number[][]): {
  means: number[];
  stds: number[];
} {
  const numFeatures = featureRows[0].length;
  const means: number[] = new Array(numFeatures).fill(0);
  const stds: number[] = new Array(numFeatures).fill(0);

  // Calculate means
  for (const row of featureRows) {
    for (let j = 0; j < numFeatures; j++) {
      means[j] += row[j];
    }
  }
  for (let j = 0; j < numFeatures; j++) {
    means[j] /= featureRows.length;
  }

  // Calculate standard deviations
  for (const row of featureRows) {
    for (let j = 0; j < numFeatures; j++) {
      stds[j] += (row[j] - means[j]) ** 2;
    }
  }
  for (let j = 0; j < numFeatures; j++) {
    stds[j] = Math.sqrt(stds[j] / featureRows.length);
    // Avoid division by zero if a feature has no variance
    if (stds[j] === 0) stds[j] = 1;
  }

  return { means, stds };
}

/**
 * Normalize a feature row using precomputed means and stds.
 * Formula: (value - mean) / std
 */
function normalize(row: number[], means: number[], stds: number[]): number[] {
  return row.map((val, i) => (val - means[i]) / stds[i]);
}

// ── Training ─────────────────────────────────────────────────────

/**
 * Train the logistic regression model on the AI4I dataset.
 *
 * How it works (simplified):
 * 1. Load all 10,000 records from the CSV.
 * 2. Extract 6 features from each record + the target (machineFailure).
 * 3. Normalize all features to have mean=0, std=1.
 * 4. Use gradient descent to find the best weights:
 *    - For each iteration, compute predictions for all records.
 *    - Compare predictions to actual labels.
 *    - Adjust weights in the direction that reduces errors.
 * 5. Store the trained weights + normalization params.
 */
export function trainModel(): TrainedModel {
  if (model?.trained) return model;

  console.log('Training prediction model...');
  const records = loadDataset();

  // Step 1: Extract features and labels
  const featureRows = records.map(recordToFeatures);
  const labels = records.map(r => r.machineFailure); // 0 or 1

  // Step 2: Compute normalization parameters from training data
  const { means, stds } = computeNormalization(featureRows);

  // Step 3: Normalize all feature rows
  const normalizedRows = featureRows.map(row => normalize(row, means, stds));

  // Step 4: Initialize weights to zero (6 features + 1 bias = 7 weights)
  const numFeatures = featureRows[0].length;
  const weights = new Array(numFeatures + 1).fill(0); // last element = bias

  // Step 5: Gradient descent
  const n = normalizedRows.length;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Accumulate gradients for all weights
    const gradients = new Array(numFeatures + 1).fill(0);

    for (let i = 0; i < n; i++) {
      // Compute prediction: sigmoid(w0*x0 + w1*x1 + ... + bias)
      let z = weights[numFeatures]; // start with bias
      for (let j = 0; j < numFeatures; j++) {
        z += weights[j] * normalizedRows[i][j];
      }
      const predicted = sigmoid(z);
      const error = predicted - labels[i]; // how far off we are

      // Accumulate gradient for each feature weight
      for (let j = 0; j < numFeatures; j++) {
        gradients[j] += error * normalizedRows[i][j];
      }
      // Gradient for bias
      gradients[numFeatures] += error;
    }

    // Update weights (move in the opposite direction of the gradient)
    for (let j = 0; j <= numFeatures; j++) {
      weights[j] -= (LEARNING_RATE / n) * gradients[j];
    }
  }

  // Store the trained model
  model = {
    weights,
    featureMeans: means,
    featureStds: stds,
    trained: true,
  };

  console.log('Model trained successfully.');
  return model;
}

// ── Prediction ───────────────────────────────────────────────────

/**
 * Predict whether a machine will fail based on its sensor readings.
 *
 * Call trainModel() first if the model hasn't been trained yet.
 *
 * @param input - The 6 sensor features for one machine
 * @returns A PredictionResult with prediction, probability, and confidence
 */
export function predict(input: PredictionInput): PredictionResult {
  // Auto-train if needed
  if (!model?.trained) {
    trainModel();
  }

  // Convert input to numeric features
  const features = inputToFeatures(input);

  // Normalize using the same parameters from training
  const normalized = normalize(features, model!.featureMeans, model!.featureStds);

  // Compute weighted sum + bias
  let z = model!.weights[normalized.length]; // bias term
  for (let j = 0; j < normalized.length; j++) {
    z += model!.weights[j] * normalized[j];
  }

  // Apply sigmoid to get probability
  const probability = sigmoid(z);

  // Classify: >= 0.5 means failure
  const prediction = probability >= 0.5 ? 'failure' : 'no_failure';

  // Confidence: how sure the model is about its prediction
  const confidence = Math.max(probability, 1 - probability);

  return {
    prediction,
    probability: Math.round(probability * 10000) / 10000, // 4 decimal places
    confidence: Math.round(confidence * 10000) / 10000,
    features: input,
  };
}

/**
 * Reset the model (forces re-training on next predict call).
 */
export function resetModel(): void {
  model = null;
}
