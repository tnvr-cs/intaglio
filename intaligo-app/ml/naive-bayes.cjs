const STOPWORDS = new Set([
  'the', 'and', 'for', 'to', 'of', 'a', 'an', 'in', 'on', 'at', 'by', 'from',
  'your', 'our', 'is', 'was', 'are', 'be', 'this', 'that', 'with', 'or', 'as',
  'card', 'payment', 'purchase', 'pos', 'contactless', 'debit', 'credit', 'txn',
  'ref', 'no', 'not', 'dd', 'so', 'fps', 'bacs', 'chq', 'visa', 'mastercard',
]);

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s&'.-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function train(samples, classCount, alpha = 1) {
  const wordCounts = Array.from({ length: classCount }, () => ({}));
  const classTotals = new Array(classCount).fill(0);
  const classDocCounts = new Array(classCount).fill(0);
  const vocabulary = new Set();

  for (const { text, label } of samples) {
    const idx = Number(label);
    if (idx < 0 || idx >= classCount) continue;
    classDocCounts[idx]++;
    const tokens = tokenize(text);
    for (const token of tokens) {
      vocabulary.add(token);
      wordCounts[idx][token] = (wordCounts[idx][token] || 0) + 1;
      classTotals[idx]++;
    }
  }

  const vocabSize = vocabulary.size;
  const totalDocs = classDocCounts.reduce((a, b) => a + b, 0);
  const classLogPriors = classDocCounts.map((count) =>
    Math.log((count + alpha) / (totalDocs + alpha * classCount)),
  );

  return {
    version: 1,
    alpha,
    vocabSize,
    vocabulary: [...vocabulary],
    classLogPriors,
    wordCounts,
    classTotals,
    classDocCounts,
    trainedAt: new Date().toISOString(),
  };
}

function predict(model, text) {
  const tokens = tokenize(text);
  const { alpha, vocabSize, classLogPriors, wordCounts, classTotals } = model;
  const classCount = classLogPriors.length;

  let bestIdx = classCount - 1;
  let bestScore = -Infinity;
  const probabilities = [];

  for (let c = 0; c < classCount; c++) {
    let score = classLogPriors[c];
    const denom = classTotals[c] + alpha * (vocabSize + 1);
    for (const token of tokens) {
      const count = wordCounts[c][token] || 0;
      score += Math.log((count + alpha) / denom);
    }
    const prob = Math.exp(score);
    probabilities.push(prob);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = c;
    }
  }

  const sum = probabilities.reduce((a, b) => a + b, 0) || 1;
  const normalized = probabilities.map((p) => p / sum);
  const confidence = normalized[bestIdx];

  return {
    categoryIndex: bestIdx,
    confidence,
    probabilities: normalized,
  };
}

function addSample(model, text, label) {
  const idx = Number(label);
  const tokens = tokenize(text);
  model.classDocCounts[idx]++;
  model.classLogPriors = model.classDocCounts.map((count) => {
    const totalDocs = model.classDocCounts.reduce((a, b) => a + b, 0);
    return Math.log(
      (count + model.alpha) /
        (totalDocs + model.alpha * model.classLogPriors.length),
    );
  });
  for (const token of tokens) {
    if (!model.vocabulary.includes(token)) {
      model.vocabulary.push(token);
      model.vocabSize = model.vocabulary.length;
    }
    model.wordCounts[idx][token] = (model.wordCounts[idx][token] || 0) + 1;
    model.classTotals[idx]++;
  }
  return model;
}

module.exports = { tokenize, train, predict, addSample };
