const fs = require('fs');
const path = require('path');
const { train, addSample } = require('../ml/naive-bayes.cjs');
const { buildTrainingSamples } = require('../ml/training-data.cjs');

const CLASS_COUNT = 8;
const OUT_PATH = path.join(__dirname, '..', 'data', 'category-model.json');
const FEEDBACK_PATH = path.join(__dirname, '..', 'data', 'ml-feedback.json');

function loadFeedback() {
  if (!fs.existsSync(FEEDBACK_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function main() {
  const samples = buildTrainingSamples();
  const feedback = loadFeedback();

  let model = train(samples, CLASS_COUNT);

  for (const row of feedback) {
    if (
      typeof row.description === 'string' &&
      Number.isInteger(row.categoryIndex) &&
      row.categoryIndex >= 0 &&
      row.categoryIndex < CLASS_COUNT
    ) {
      model = addSample(model, row.description, row.categoryIndex);
    }
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(model, null, 2) + '\n', 'utf8');

  console.log(`Trained category model → ${OUT_PATH}`);
  console.log(`  samples: ${samples.length} base + ${feedback.length} feedback`);
  console.log(`  vocabulary: ${model.vocabSize} tokens`);
}

main();
