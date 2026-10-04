import { describe, it, expect } from 'vitest';
import { normalizeText, levenshtein, keywordMatches, matchCriterion } from '../utils/textMatch.js';
import { cleanAndValidateQuestions } from '../utils/validateCriteria.js';

describe('normalizeText', () => {
  it('lowercases, strips accents and punctuation, collapses spaces', () => {
    expect(normalizeText('  Cardiogénique,  THORACIQUE! ')).toBe('cardiogenique thoracique');
  });
  it('folds ligatures NFD misses', () => {
    expect(normalizeText('œdème aigu')).toBe('oedeme aigu');
    expect(normalizeText('Æsop')).toBe('aesop');
  });
  it('is idempotent and null-safe', () => {
    expect(normalizeText(normalizeText('Douleur,  œdèmes!'))).toBe('douleur oedemes');
    expect(normalizeText(null)).toBe('');
  });
});

describe('levenshtein', () => {
  it('scores equal strings 0', () => { expect(levenshtein('souffle', 'souffle', 1)).toBe(0); });
  it('catches the bsence/absence typo', () => { expect(levenshtein('bsence', 'absence', 2)).toBeLessThanOrEqual(2); });
  it('early-exits past maxDist', () => { expect(levenshtein('douleur', 'xyz', 1)).toBeGreaterThan(1); });
});

describe('keywordMatches', () => {
  it('matches exact/case variants (fast path)', () => {
    expect(keywordMatches('Douleur thoracique intense', 'douleur')).toBe(true);
  });
  it('matches unaccented keyword against accented text', () => {
    expect(keywordMatches('œdèmes des membres inférieurs', 'oedeme')).toBe(true);
  });
  it('matches ligature text against folded keyword', () => {
    expect(keywordMatches('souffle cardiaque', 'souffle')).toBe(true);
  });
  it('tolerates one typo with same first letter', () => {
    expect(keywordMatches('absence de souffle', 'bsence')).toBe(true);
    expect(keywordMatches('souffle systolique', 'soufle')).toBe(true);
  });
  it('rejects same-distance words with different first letter', () => {
    expect(keywordMatches('souffle cardiaque', 'mouffle')).toBe(false);
    expect(keywordMatches('la couleur est pale', 'douleur')).toBe(false);
  });
  it('accepts leading-character insertion/deletion (bsence -> absence)', () => {
    expect(keywordMatches('bsence de pouls', 'absence')).toBe(true);
    expect(matchCriterion('bsence de pouls', ['absence'])).toBe('absence');
  });
  it('matches multi-word phrases with one typo', () => {
    expect(keywordMatches('oedeme aigu du poumon', 'oedeme aigue du poumon')).toBe(true);
  });
  it('rejects phrases with a truly different word', () => {
    expect(keywordMatches('douleur abdominale', 'douleur thoracique')).toBe(false);
  });
  it('rejects empty keywords and overlong phrases', () => {
    expect(keywordMatches('douleur', '')).toBe(false);
    expect(keywordMatches('douleur', 'douleur thoracique intense et prolongee')).toBe(false);
  });
});

describe('matchCriterion', () => {
  it('returns the first matching keyword in original spelling', () => {
    expect(matchCriterion('FA avec fibrillation', ['OAP', 'fibrillation atriale'])).toBe(null);
    expect(matchCriterion('fibrillation atriale rapide', ['FA', 'fibrillation atriale'])).toBe('fibrillation atriale');
  });
  it('skips blank keywords', () => {
    expect(matchCriterion('douleur', ['', '  ', 'douleur'])).toBe('douleur');
    expect(matchCriterion('douleur', [])).toBe(null);
  });
});

describe('cleanAndValidateQuestions', () => {
  it('strips fully-empty rows and trims the rest', () => {
    const { questions, errors } = cleanAndValidateQuestions([
      { questionText: 'Q1', criteria: [{ label: '  Diag ', keywords: [' fa ', ''] }, { label: '', keywords: [] }] },
    ]);
    expect(errors).toEqual([]);
    expect(questions[0].criteria).toEqual([{ label: 'Diag', keywords: ['fa'] }]);
  });
  it('reports bare-label and missing-label violations', () => {
    const { errors } = cleanAndValidateQuestions([
      { questionText: 'Q1', criteria: [{ label: 'Attitude', keywords: [] }, { label: '', keywords: ['x'] }] },
    ]);
    expect(errors.length).toBe(2);
    expect(errors[0]).toMatch(/Attitude.*keyword/);
    expect(errors[1]).toMatch(/label/);
  });
  it('passes clean input untouched', () => {
    const { questions, errors } = cleanAndValidateQuestions([
      { questionText: 'Q1', criteria: [{ label: 'A', keywords: ['x'] }] },
    ]);
    expect(errors).toEqual([]);
    expect(questions[0].criteria).toEqual([{ label: 'A', keywords: ['x'] }]);
  });
});
