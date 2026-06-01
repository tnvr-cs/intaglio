const MERCHANTS = [
  // Rent
  ['rent payment', 'landlord transfer', 'mortgage halifax', 'letting agent', 'housing association', 'spare room rent', 'accommodation fee', 'estate management'],
  // Food
  ['tesco stores', 'sainsburys local', 'asda superstore', 'morrisons daily', 'aldi grocery', 'lidl food', 'waitrose partners', 'co op food', 'iceland foods', 'marks spencer food', 'deliveroo order', 'uber eats', 'just eat takeaway', 'greggs bakery', 'pret a manger', 'costa coffee', 'starbucks coffee', 'nandos restaurant', 'mcdonalds', 'kfc fast food', 'subway sandwich', 'dominos pizza', 'wagamama', 'itsu sushi', 'gails bakery', 'whole foods'],
  // Transport
  ['tfl travel', 'underground ticket', 'national rail', 'trainline booking', 'uber trip', 'bolt ride', 'shell petrol', 'bp fuel', 'esso garage', 'texaco fuel', 'parking meter', 'ringgo parking', 'lime bike', 'ryanair flight', 'easyjet booking', 'national express', 'zipcar rental', 'dvla vehicle'],
  // Shopping
  ['amazon marketplace', 'amazon prime', 'asos online', 'primark store', 'zara fashion', 'hm clothing', 'ebay purchase', 'etsy handmade', 'argos store', 'john lewis', 'boots pharmacy', 'superdrug', 'ikea furniture', 'currys electrical', 'apple store', 'uniqlo', 'sports direct', 'tk maxx'],
  // Bills
  ['british gas', 'edf energy', 'eon next', 'octopus energy', 'thames water', 'severn trent', 'vodafone bill', 'ee mobile', 'o2 phone', 'bt broadband', 'sky tv', 'council tax', 'hmrc payment', 'tv licence', 'home insurance', 'aviva insurance', 'barclays insurance'],
  // Subscriptions
  ['netflix subscription', 'netflix.com', 'spotify premium', 'spotify.com', 'disney plus', 'disneyplus', 'apple.com bill', 'google storage', 'adobe creative', 'microsoft 365', 'puregym membership', 'gym group', 'audible', 'youtube premium', 'dropbox plus', 'amazon prime video', 'playstation plus', 'xbox game pass', 'canva pro', 'now tv', 'paramount plus'],
  // Savings
  ['transfer to savings', 'isa deposit', 'premium bonds', 'vanguard invest', 'nutmeg savings', 'monzo pot', 'starling spaces', 'chip savings'],
  // Other
  ['cash withdrawal', 'atm withdrawal', 'foreign exchange', 'charity donation', 'post office', 'paypal transfer', 'wise transfer', 'monzo split', 'unknown merchant', 'general purchase'],
];

const PREFIXES = ['', 'card payment ', 'contactless ', 'dd ', 'direct debit ', 'fps ', 'bacs ', 'pos ', 'txn '];
const SUFFIXES = ['', ' london', ' uk', ' online', ' mobile', ' store', ' ltd', ' limited'];

function expandTemplates(baseTexts, label) {
  const samples = [];
  for (const base of baseTexts) {
    samples.push({ text: base, label });
    for (const pre of PREFIXES.slice(0, 4)) {
      samples.push({ text: pre + base, label });
    }
    for (const suf of SUFFIXES.slice(0, 3)) {
      samples.push({ text: base + suf, label });
    }
  }
  return samples;
}

function buildTrainingSamples() {
  const samples = [];
  MERCHANTS.forEach((texts, label) => {
    samples.push(...expandTemplates(texts, label));
  });
  return samples;
}

module.exports = { buildTrainingSamples, MERCHANTS };
