import { factorial } from '../math_utils';

describe('math_utils: factorial()', () => {
  it('correctly calculates factorial of 0 and 1', () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
  });

  it('correctly calculates factorial of positive integers', () => {
    expect(factorial(5)).toBe(120);
    expect(factorial(6)).toBe(720);
  });

  it('throws RangeError for negative numbers and non-integers', () => {
    expect(() => factorial(-1)).toThrow(RangeError);
    expect(() => factorial(2.5)).toThrow(RangeError);
  });
});
