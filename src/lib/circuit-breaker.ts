import { createScopedLogger } from './logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures before opening (default: 5)
  resetTimeoutMs?: number; // Time to stay OPEN before testing HALF_OPEN (default: 30,000 ms)
  timeoutMs?: number; // Per-execution timeout (default: 10,000 ms)
  name?: string;
}

export class CircuitBreakerOpenError extends Error {
  public readonly circuitName: string;

  constructor(circuitName: string, message?: string) {
    super(
      message ||
        `Circuit breaker '${circuitName}' is OPEN. Fast-failing external request to prevent cascade failure.`
    );
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = circuitName;
  }
}

export class CircuitBreakerTimeoutError extends Error {
  public readonly circuitName: string;

  constructor(circuitName: string, timeoutMs: number) {
    super(
      `Call to external service in '${circuitName}' timed out after ${timeoutMs}ms.`
    );
    this.name = 'CircuitBreakerTimeoutError';
    this.circuitName = circuitName;
  }
}

export class CircuitBreaker {
  private name: string;
  private failureThreshold: number;
  private resetTimeoutMs: number;
  private timeoutMs: number;

  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttempt = 0;
  private logger = createScopedLogger('CircuitBreaker');

  constructor(options: CircuitBreakerOptions = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.timeoutMs = options.timeoutMs || 10000;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.logger.info(
        `Circuit '${this.name}' transitioned from OPEN to HALF_OPEN (testing recovery).`
      );
    }
    return this.state;
  }

  public async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      this.logger.warn(
        `Fast-failing request: circuit '${this.name}' is OPEN. Retrying allowed at ${new Date(this.nextAttempt).toISOString()}`
      );
      if (fallback) {
        return fallback();
      }
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (err: unknown) {
      this.onFailure(err);
      if (fallback) {
        this.logger.warn(
          `Execution failed for '${this.name}', invoking fallback.`,
          {
            error: err instanceof Error ? err.message : String(err),
          }
        );
        return fallback();
      }
      throw err;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (this.timeoutMs <= 0) {
      return fn();
    }

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new CircuitBreakerTimeoutError(this.name, this.timeoutMs));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([fn(), timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.logger.info(
        `Trial request succeeded. Circuit '${this.name}' reset to CLOSED.`
      );
    }
    this.state = 'CLOSED';
    this.failureCount = 0;
  }

  private onFailure(error: unknown) {
    this.failureCount++;
    this.logger.warn(
      `Call failed in circuit '${this.name}' (attempt ${this.failureCount}/${this.failureThreshold}):`,
      { error: error instanceof Error ? error.message : String(error) }
    );

    if (
      this.state === 'HALF_OPEN' ||
      this.failureCount >= this.failureThreshold
    ) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
      this.logger.error(
        `Circuit '${this.name}' is now OPEN for ${this.resetTimeoutMs}ms due to repeated failures.`
      );
    }
  }

  public reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = 0;
  }
}

// Global registry of named circuit breakers
const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  options?: CircuitBreakerOptions
): CircuitBreaker {
  const existing = registry.get(name);
  if (existing) {
    return existing;
  }
  const breaker = new CircuitBreaker({ ...options, name });
  registry.set(name, breaker);
  return breaker;
}
