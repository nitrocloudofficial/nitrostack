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
/** The 6 sensor features used as prediction inputs */
export interface PredictionInput {
    type: string;
    airTemp: number;
    processTemp: number;
    rotationalSpeed: number;
    torque: number;
    toolWear: number;
}
/** The prediction result returned to the caller */
export interface PredictionResult {
    prediction: 'failure' | 'no_failure';
    probability: number;
    confidence: number;
    features: PredictionInput;
}
/** Internal model state (weights + normalization parameters) */
interface TrainedModel {
    weights: number[];
    featureMeans: number[];
    featureStds: number[];
    trained: boolean;
}
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
export declare function trainModel(): TrainedModel;
/**
 * Predict whether a machine will fail based on its sensor readings.
 *
 * Call trainModel() first if the model hasn't been trained yet.
 *
 * @param input - The 6 sensor features for one machine
 * @returns A PredictionResult with prediction, probability, and confidence
 */
export declare function predict(input: PredictionInput): PredictionResult;
/**
 * Reset the model (forces re-training on next predict call).
 */
export declare function resetModel(): void;
export {};
//# sourceMappingURL=prediction-engine.d.ts.map