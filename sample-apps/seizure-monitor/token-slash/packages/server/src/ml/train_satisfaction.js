const fs = require('fs');
const path = require('path');

function trainSatisfactionModel() {
  const dataPath = path.join(__dirname, '..', 'data', 'mock-history.json');
  const outputPath = path.join(__dirname, 'satisfaction-model.json');

  const history = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  function getTier(modelName) {
    const light = ["gpt-4o-mini", "gemini-3.1-flash-lite", "claude-3-5-haiku"];
    const standard = ["gemini-3.5-flash", "claude-3-5-sonnet", "gpt-4o"];
    const advanced = ["gemini-3.1-pro", "claude-3-opus"];
    const reasoning = ["o3-mini", "o1"];
    if (light.includes(modelName)) return 1;
    if (standard.includes(modelName)) return 2;
    if (advanced.includes(modelName)) return 3;
    if (reasoning.includes(modelName)) return 4;
    return 2;
  }

  function getNeededTier(complexity) {
    if (complexity <= 3) return 1;
    if (complexity <= 6) return 2;
    if (complexity <= 8) return 3;
    return 4;
  }

  const X = [];
  const y = [];

  for (const entry of history) {
    const comp = Number(entry.complexityScore);
    const tokens = (Number(entry.inputTokens) + Number(entry.outputTokens)) / 1000.0;
    const usedTier = getTier(entry.modelUsed);
    const neededTier = getNeededTier(entry.complexityScore);
    const tierMismatch = Math.max(0, usedTier - neededTier);
    const retries = Number(entry.retriesCount);
    const satisfied = entry.userSatisfied ? 1.0 : 0.0;

    X.push([comp, tokens, tierMismatch, retries]);
    y.push(satisfied);
  }

  let weights = [0.1, -0.05, -0.8, -1.2];
  let bias = 2.5;
  const lr = 0.05;
  const epochs = 300;
  const n = X.length;

  for (let ep = 0; ep < epochs; ep++) {
    const dw = [0.0, 0.0, 0.0, 0.0];
    let db = 0.0;
    for (let i = 0; i < n; i++) {
      const z = bias + weights[0] * X[i][0] + weights[1] * X[i][1] + weights[2] * X[i][2] + weights[3] * X[i][3];
      const p = 1.0 / (1.0 + Math.exp(-Math.max(-20.0, Math.min(20.0, z))));
      const err = p - y[i];
      for (let j = 0; j < 4; j++) {
        dw[j] += err * X[i][j];
      }
      db += err;
    }
    for (let j = 0; j < 4; j++) {
      weights[j] -= lr * (dw[j] / n);
    }
    bias -= lr * (db / n);
  }

  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < n; i++) {
    const z = bias + weights[0] * X[i][0] + weights[1] * X[i][1] + weights[2] * X[i][2] + weights[3] * X[i][3];
    const p = 1.0 / (1.0 + Math.exp(-Math.max(-20.0, Math.min(20.0, z))));
    const pred = p >= 0.5 ? 1.0 : 0.0;
    if (pred === 1.0 && y[i] === 1.0) tp++;
    else if (pred === 1.0 && y[i] === 0.0) fp++;
    else if (pred === 0.0 && y[i] === 0.0) tn++;
    else fn++;
  }

  const accuracy = Math.round(((tp + tn) / n) * 10000) / 10000;
  const precision = Math.round((tp / (tp + fp || 1)) * 10000) / 10000;
  const recall = Math.round((tp / (tp + fn || 1)) * 10000) / 10000;

  const modelArtifact = {
    intercept: Math.round(bias * 10000) / 10000,
    featureWeights: {
      complexityScore: Math.round(weights[0] * 10000) / 10000,
      tokenVolume: Math.round(weights[1] * 10000) / 10000,
      tierMismatch: Math.round(weights[2] * 10000) / 10000,
      retryCountPenalty: Math.round(weights[3] * 10000) / 10000
    },
    accuracy,
    precision,
    recall,
    trainedAt: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, JSON.stringify(modelArtifact, null, 2), 'utf8');
  console.log(`ML Satisfaction Model successfully trained and saved to ${outputPath}`);
  console.log(`Metrics - Accuracy: ${(accuracy * 100).toFixed(2)}%, Precision: ${(precision * 100).toFixed(2)}%, Recall: ${(recall * 100).toFixed(2)}%`);
}

trainSatisfactionModel();
