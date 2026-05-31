import { CATEGORIES } from './config.js';
import { categorizeDescription as mlCategorize, loadCategoryModel } from './category-classifier.js';

const CATEGORY_KEYWORDS = [
  ['rent', 'landlord', 'mortgage', 'housing', 'letting', 'estate agent'],
  [
    'tesco', 'sainsbury', 'asda', 'morrisons', 'aldi', 'lidl', 'waitrose',
    'co-op', 'iceland', 'food', 'restaurant', 'cafe', 'deliveroo', 'uber eats',
    'just eat', 'greggs', 'pret', 'costa', 'starbucks', 'grocery', 'supermarket',
    'nandos', 'mcdonald', 'kfc', 'subway', 'bakery', 'marks & spencer',
  ],
  [
    'tfl', 'train', 'uber trip', 'bolt', 'petrol', 'shell', 'bp', 'esso',
    'parking', 'national rail', 'transport', 'bus', 'tube', 'lime', 'ryanair',
    'easyjet', 'fuel', 'texaco',
  ],
  [
    'amazon', 'asos', 'primark', 'zara', 'h&m', 'shopping', 'ebay', 'etsy',
    'argos', 'john lewis', 'next ', 'boots', 'superdrug', 'ikea', 'currys',
  ],
  [
    'british gas', 'edf', 'eon', 'octopus energy', 'vodafone', 'ee ', 'o2 ',
    'bt ', 'sky ', 'electric', 'water', 'council tax', 'utility', 'broadband',
    'thames water', 'severn trent', 'insurance', 'hmrc',
  ],
  [
    'netflix', 'spotify', 'disney', 'apple.com', 'google storage', 'subscription',
    'adobe', 'microsoft 365', 'gym', 'puregym', 'audible', 'prime video',
    'youtube premium', 'dropbox',
  ],
  ['savings', 'isa', 'premium bonds', 'vanguard', 'nutmeg', 'transfer to save'],
];

const SKIP_LINE =
  /balance\s+brought|opening\s+balance|closing\s+balance|statement\s+period|page\s+\d|account\s+number|sort\s+code|continued|subtotal|total\s+paid|total\s+received|arranged\s+overdraft|available\s+balance/i;

const INCOME_LINE = /salary|wages|payroll|credit\s+transfer|refund|interest\s+paid/i;

function keywordCategorize(text) {
  const lower = text.toLowerCase();
  for (let i = 0; i < CATEGORY_KEYWORDS.length; i++) {
    if (CATEGORY_KEYWORDS[i].some((kw) => lower.includes(kw))) return i;
  }
  return CATEGORIES.length - 1;
}

function parseAmount(raw) {
  const n = parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function extractAmountsFromLine(line) {
  const amounts = [];
  const patterns = [
    /£\s*([\d,]+\.\d{2})/g,
    /([\d,]+\.\d{2})\s*(?:DR|DEBIT)?\b/gi,
    /-\s*£?\s*([\d,]+\.\d{2})/g,
    /£\s*([\d,]+)(?!\.\d)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(line)) !== null) {
      const val = parseAmount(m[1]);
      if (val !== null && val > 0 && val < 50000) amounts.push(val);
    }
  }
  return amounts;
}

function isSkippedLine(line) {
  if (line.length < 4) return true;
  if (SKIP_LINE.test(line)) return true;
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(line.trim())) return true;
  return false;
}

function cleanDescription(line) {
  let desc = line
    .replace(/£\s*[\d,]+\.?\d*/g, '')
    .replace(/[\d,]+\.\d{2}\s*(?:CR|DR|DEBIT|CREDIT)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (desc.length < 2) desc = line.slice(0, 60).trim();
  return desc || 'Transaction';
}

function sumTotals(transactions) {
  const totals = CATEGORIES.map(() => 0);
  for (const t of transactions) {
    totals[t.categoryIndex] += t.amount;
  }
  return totals.map((v) => Math.round(v));
}

export async function parseStatementText(ocrText) {
  await loadCategoryModel();

  const lines = ocrText
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const transactions = [];
  const seen = new Set();

  for (const line of lines) {
    if (isSkippedLine(line)) continue;
    if (INCOME_LINE.test(line) && !/debit|payment|purchase/i.test(line)) continue;

    const amounts = extractAmountsFromLine(line);
    if (!amounts.length) continue;

    const amount = amounts[amounts.length - 1];
    const desc = cleanDescription(line);
    const key = `${desc.slice(0, 40)}|${amount}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const fullText = desc + ' ' + line;
    const { categoryIndex, confidence, source } = await mlCategorize(
      fullText,
      keywordCategorize,
    );

    transactions.push({
      description: desc.slice(0, 80),
      amount: Math.round(amount * 100) / 100,
      categoryIndex,
      categoryName: CATEGORIES[categoryIndex].name,
      confidence: Math.round(confidence * 100) / 100,
      source,
      originalCategoryIndex: categoryIndex,
    });
  }

  return {
    transactions,
    totals: sumTotals(transactions),
    modelUsed: true,
  };
}

export function recalculateTotals(transactions) {
  return sumTotals(transactions);
}
