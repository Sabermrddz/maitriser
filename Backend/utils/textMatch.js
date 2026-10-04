// Text matching for ECOS automatic grading.
//
// Pipeline per (answer, keyword):
//   1. normalize both (accents, case, punctuation, spacing, ligatures)
//   2. exact normalized-substring fast path (preserves historical behavior)
//   3. strict fuzzy fallback: sliding window of words, every keyword word must
//      match its aligned answer word with Levenshtein distance <= 1 AND the
//      same first letter (very strict: medical grading prefers misses to
//      false passes, e.g. "bsence" hits "absence" but "mur" never hits "sur").

// Lowercase, strip diacritics, fold ligatures NFD misses (œ, æ), drop
// punctuation, collapse whitespace. Idempotent.
export function normalizeText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein with early exit past maxDist (answers/keywords are short).
export function levenshtein(a, b, maxDist = 1) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;
  let prev = new Array(lb + 1);
  let cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const ca = a[i - 1];
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    const tmp = prev;
    prev = cur;
    cur = tmp;
  }
  return prev[lb];
}

function wordMatch(answerWord, keywordWord) {
  if (!answerWord || !keywordWord) return false;
  if (answerWord === keywordWord) return true;
  if (answerWord[0] === keywordWord[0]) {
    return levenshtein(answerWord, keywordWord, 1) <= 1;
  }
  // Leading-character insertion/deletion only (e.g. "bsence" for "absence"):
  // one word must equal the other minus its first character. This keeps
  // genuinely different words apart ("couleur" never hits "douleur").
  if (answerWord.length >= 3 && keywordWord.length >= 3) {
    if (answerWord === keywordWord.slice(1) || keywordWord === answerWord.slice(1)) return true;
  }
  return false;
}

// True when the keyword is expressed in the answer text.
export function keywordMatches(answerText, keyword) {
  const t = normalizeText(answerText);
  const k = normalizeText(keyword);
  if (!k) return false;
  if (t.includes(k)) return true;
  const tw = t.split(' ');
  const kw = k.split(' ');
  if (kw.length > tw.length) return false;
  for (let i = 0; i <= tw.length - kw.length; i++) {
    let ok = true;
    for (let j = 0; j < kw.length; j++) {
      if (!wordMatch(tw[i + j], kw[j])) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// First matching keyword (original spelling) or null. One hit validates.
export function matchCriterion(answerText, keywords) {
  for (const kw of keywords || []) {
    if ((kw || '').trim() && keywordMatches(answerText, kw)) return kw;
  }
  return null;
}
