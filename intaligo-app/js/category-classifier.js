import { apiUrl } from './api.js';
import { CATEGORIES } from './config.js';

const MODEL_URL = '/data/category-model.json';
const FEEDBACK_KEY = 'intaglio_ml_feedback';
const MIN_CONFIDENCE = 0.35;

let model = null;
let modelLoadPromise = null;

function tokenize(text) {
  const STOPWORDS = new Set([
    'the', 'and', 'for', 'to', 'of', 'a', 'an', 'in', 'on', 'at', 'by', 'from',
    'your', 'our', 'is', 'was', 'are', 'be', 'this', 'that', 'with', 'or', 'as',
    'card', 'payment', 'purchase', 'pos', 'contactless', 'debit', 'credit', 'txn',
    'ref', 'no', 'not', 'dd', 'so', 'fps', 'bacs', 'chq', 'visa', 'mastercard',
  ]);
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s&'.-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function predictWithModel(m, text) {
  const tokens = tokenize(text);
  const { alpha, vocabSize, classLogPriors, wordCounts, classTotals } = m;
  const classCount = classLogPriors.length;

  let bestIdx = classCount - 1;
  let bestScore = -Infinity;
  const scores = [];

  for (let c = 0; c < classCount; c++) {
    let score = classLogPriors[c];
    const denom = classTotals[c] + alpha * (vocabSize + 1);
    for (const token of tokens) {
      const count = wordCounts[c][token] || 0;
      score += Math.log((count + alpha) / denom);
    }
    scores.push(score);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = c;
    }
  }

  const expScores = scores.map((s) => Math.exp(s - bestScore));
  const sum = expScores.reduce((a, b) => a + b, 0) || 1;
  const probabilities = expScores.map((e) => e / sum);

  return {
    categoryIndex: bestIdx,
    confidence: probabilities[bestIdx],
    probabilities,
  };
}

export async function loadCategoryModel() {
  if (model) return model;
  if (!modelLoadPromise) {
    modelLoadPromise = fetch(MODEL_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Model not found');
        return res.json();
      })
      .then((data) => {
        model = mergeLocalFeedback(data);
        return model;
      })
      .catch((err) => {
        console.warn('category model failed to load:', err.message);
        model = null;
        return null;
      });
  }
  return modelLoadPromise;
}

function loadLocalFeedback() {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFeedback(items) {
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items.slice(-200)));
}

function mergeLocalFeedback(baseModel) {
  const feedback = loadLocalFeedback();
  if (!feedback.length) return baseModel;

  let m = structuredClone(baseModel);
  for (const row of feedback) {
    if (
      typeof row.description === 'string' &&
      Number.isInteger(row.categoryIndex) &&
      row.categoryIndex >= 0 &&
      row.categoryIndex < CATEGORIES.length
    ) {
      m = addSampleInPlace(m, row.description, row.categoryIndex);
    }
  }
  return m;
}

function addSampleInPlace(m, text, label) {
  const idx = Number(label);
  const tokens = tokenize(text);
  m.classDocCounts[idx]++;
  const totalDocs = m.classDocCounts.reduce((a, b) => a + b, 0);
  const classCount = m.classLogPriors.length;
  m.classLogPriors = m.classDocCounts.map(
    (count) => Math.log((count + m.alpha) / (totalDocs + m.alpha * classCount)),
  );
  for (const token of tokens) {
    if (!m.vocabulary.includes(token)) {
      m.vocabulary.push(token);
      m.vocabSize = m.vocabulary.length;
    }
    if (!m.wordCounts[idx]) m.wordCounts[idx] = {};
    m.wordCounts[idx][token] = (m.wordCounts[idx][token] || 0) + 1;
    m.classTotals[idx]++;
  }
  return m;
}

export function predictCategory(text, loadedModel = model) {
  if (!loadedModel) {
    return {
      categoryIndex: CATEGORIES.length - 1,
      confidence: 0,
      probabilities: CATEGORIES.map(() => 1 / CATEGORIES.length),
      source: 'fallback',
    };
  }

  const result = predictWithModel(loadedModel, text);
  return { ...result, source: 'ml' };
}

export async function categorizeDescription(text, keywordFallback) {
  const m = await loadCategoryModel();
  const prediction = predictCategory(text, m);

  if (prediction.confidence >= MIN_CONFIDENCE) {
    return {
      categoryIndex: prediction.categoryIndex,
      confidence: prediction.confidence,
      source: 'ml',
    };
  }

  const kwIndex = keywordFallback(text);
  return {
    categoryIndex: kwIndex,
    confidence: prediction.confidence,
    source: 'keywords',
  };
}

export async function recordCategoryFeedback(description, categoryIndex) {
  const entry = {
    description: String(description).trim().slice(0, 200),
    categoryIndex,
    at: new Date().toISOString(),
  };

  const items = loadLocalFeedback();
  items.push(entry);
  saveLocalFeedback(items);

  if (model) {
    model = addSampleInPlace(model, entry.description, categoryIndex);
  }

  try {
    await fetch(apiUrl('/api/ml/feedback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch { /* local only */ }
}

export function isModelReady() {
  return model !== null;
}
