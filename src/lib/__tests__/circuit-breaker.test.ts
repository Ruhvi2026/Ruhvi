import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerTimeoutError,
  getCircuitBreaker,
} from '../circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes a successful operation and stays CLOSED', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      timeoutMs: 500,
      name: 'test-success',
    });

    const result = await breaker.execute(async () => 'OK');
    expect(result).toBe('OK');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('trips from CLOSED to OPEN after reaching failureThreshold', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      timeoutMs: 500,
      name: 'test-trip',
    });

    // 1st failure
    await expect(
      breaker.execute(async () => {
        throw new Error('Failure 1');
      })
    ).rejects.toThrow('Failure 1');
    expect(breaker.getState()).toBe('CLOSED');

    // 2nd failure -> reaches threshold
    await expect(
      breaker.execute(async () => {
        throw new Error('Failure 2');
      })
    ).rejects.toThrow('Failure 2');
    expect(breaker.getState()).toBe('OPEN');

    // Subsequent call fast-fails without executing fn
    const spyFn = jest.fn();
    await expect(breaker.execute(spyFn)).rejects.toThrow(
      CircuitBreakerOpenError
    );
    expect(spyFn).not.toHaveBeenCalled();
  });

  it('executes fallback when circuit is OPEN', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 1000,
      name: 'test-fallback-open',
    });

    // Trip the breaker
    await expect(
      breaker.execute(async () => {
        throw new Error('Initial fail');
      })
    ).rejects.toThrow('Initial fail');
    expect(breaker.getState()).toBe('OPEN');

    // Execute with fallback
    const result = await breaker.execute(
      async () => 'should not run',
      async () => 'fallback-value'
    );
    expect(result).toBe('fallback-value');
  });

  it('transitions to HALF_OPEN after resetTimeoutMs expires, then recovers to CLOSED on success', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 50, // 50ms for fast testing
      name: 'test-half-open',
    });

    // Trip breaker
    await expect(
      breaker.execute(async () => {
        throw new Error('Fail');
      })
    ).rejects.toThrow('Fail');
    expect(breaker.getState()).toBe('OPEN');

    // Wait 60ms for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(breaker.getState()).toBe('HALF_OPEN');

    // Successful trial run restores CLOSED state
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('throws CircuitBreakerTimeoutError when operation exceeds timeoutMs', async () => {
    const breaker = new CircuitBreaker({
      timeoutMs: 30, // 30ms timeout
      failureThreshold: 3,
      name: 'test-timeout',
    });

    await expect(
      breaker.execute(
        () => new Promise((resolve) => setTimeout(() => resolve('late'), 100))
      )
    ).rejects.toThrow(CircuitBreakerTimeoutError);
  });

  it('returns singleton instance from registry', () => {
    const b1 = getCircuitBreaker('shared-service');
    const b2 = getCircuitBreaker('shared-service');
    expect(b1).toBe(b2);
  });
});
