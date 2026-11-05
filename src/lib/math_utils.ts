/**
 * Math Utilities for Project Ruhvi
 * Provides mathematical helper functions.
 */

/**
 * Calculates the factorial of a non-negative integer.
 * @param n - Non-negative integer (0 <= n <= 170)
 * @returns Factorial of n
 * @throws {RangeError} If n is negative or not an integer
 */
export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(
      'Factorial is only defined for non-negative integers.'
    );
  }
  if (n === 0 || n === 1) {
    return 1;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
