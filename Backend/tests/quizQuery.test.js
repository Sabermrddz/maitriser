import { describe, it, expect } from 'vitest';
import { parseCourseFilter, parseCount, wantsRandom, MAX_QUESTIONS } from '../utils/quizQuery.js';

describe('parseCourseFilter', () => {
  it('returns null when course is absent', () => {
    expect(parseCourseFilter(undefined)).toBeNull();
    expect(parseCourseFilter(null)).toBeNull();
    expect(parseCourseFilter('')).toBeNull();
    expect(parseCourseFilter([])).toBeNull();
  });

  it('returns a plain string for a single course', () => {
    expect(parseCourseFilter('Cardiologie')).toBe('Cardiologie');
    expect(parseCourseFilter(['Cardiologie'])).toBe('Cardiologie');
  });

  it('returns $in for repeated courses', () => {
    expect(parseCourseFilter(['Cardio', 'Pneumo'])).toEqual({ $in: ['Cardio', 'Pneumo'] });
  });

  it('trims values and drops empty entries', () => {
    expect(parseCourseFilter(['  Cardio  ', '', '  '])).toBe('Cardio');
    expect(parseCourseFilter(['A', '', 'B'])).toEqual({ $in: ['A', 'B'] });
  });
});

describe('parseCount', () => {
  it('returns null when count is not requested or not numeric', () => {
    expect(parseCount({})).toBeNull();
    expect(parseCount({ count: 'abc' })).toBeNull();
  });

  it('parses a valid count', () => {
    expect(parseCount({ count: '20' })).toBe(20);
    expect(parseCount({ count: 200 })).toBe(200);
  });

  it('clamps to the allowed range', () => {
    expect(parseCount({ count: '0' })).toBe(1);
    expect(parseCount({ count: '-5' })).toBe(1);
    expect(parseCount({ count: String(MAX_QUESTIONS + 1) })).toBe(MAX_QUESTIONS);
  });
});

describe('wantsRandom', () => {
  it('accepts true/1 only', () => {
    expect(wantsRandom({ random: 'true' })).toBe(true);
    expect(wantsRandom({ random: '1' })).toBe(true);
    expect(wantsRandom({ random: 'false' })).toBe(false);
    expect(wantsRandom({})).toBe(false);
  });
});
