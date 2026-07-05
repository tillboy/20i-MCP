// Unit tests for src/core/validation.ts - currently focused on the tightened
// validatePositiveNumber (positive-integer semantics for IDs/years/TTLs).

import { describe, it, expect } from '@jest/globals';
import { validatePositiveNumber } from '../../src/core/validation';
import { ValidationError } from '../../src/core/errors';

describe('validatePositiveNumber', () => {
  describe('accepted inputs (types existing call sites legitimately pass)', () => {
    it('accepts a positive integer number', () => {
      expect(validatePositiveNumber(5, 'field')).toBe(5);
      expect(validatePositiveNumber(3269253, 'package_id')).toBe(3269253);
    });

    it('accepts a numeric string containing a positive integer', () => {
      expect(validatePositiveNumber('42', 'field')).toBe(42);
      expect(validatePositiveNumber(' 7 ', 'field')).toBe(7);
    });
  });

  describe('rejected inputs', () => {
    it('rejects booleans (previously coerced: Number(true) === 1)', () => {
      expect(() => validatePositiveNumber(true, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(false, 'field')).toThrow(ValidationError);
    });

    it('rejects arrays (previously coerced: Number([123]) === 123)', () => {
      expect(() => validatePositiveNumber([123], 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber([], 'field')).toThrow(ValidationError);
    });

    it('rejects objects', () => {
      expect(() => validatePositiveNumber({}, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber({ value: 5 }, 'field')).toThrow(ValidationError);
    });

    it('rejects non-integers (integer ID semantics)', () => {
      expect(() => validatePositiveNumber(2.5, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber('2.5', 'field')).toThrow(ValidationError);
    });

    it('rejects NaN and +/-Infinity', () => {
      expect(() => validatePositiveNumber(NaN, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(Infinity, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(-Infinity, 'field')).toThrow(ValidationError);
    });

    it('rejects zero, negatives, null/undefined, and non-numeric strings', () => {
      expect(() => validatePositiveNumber(0, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(-5, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(null, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(undefined, 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber('', 'field')).toThrow(ValidationError);
      expect(() => validatePositiveNumber('abc', 'field')).toThrow(ValidationError);
    });

    it('includes the field name in the error message', () => {
      expect(() => validatePositiveNumber(true, 'package_id')).toThrow(
        'package_id must be a positive integer'
      );
    });
  });
});
