/**
 * Retry Utility with Exponential Backoff
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "NOTFOUND", "TIMEOUT", "RATE_LIMIT"],
  nonRetryableErrors: ["INVALID_INPUT", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "INSUFFICIENT_BALANCE"],
};

function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

function isRetryable(error: Error, config: RetryConfig): boolean {
  const errorMessage = error.message.toUpperCase();
  if (config.nonRetryableErrors?.some(e => errorMessage.includes(e))) return false;
  if (config.retryableErrors?.some(e => errorMessage.includes(e))) return true;
  return errorMessage.includes("TIMEOUT") || errorMessage.includes("NETWORK") || errorMessage.includes("CONN");
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(operation: () => Promise<T>, config: Partial<RetryConfig> = {}): Promise<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;
  
  for (let attempt = 1; attempt <= fullConfig.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt > fullConfig.maxRetries) throw lastError;
      if (!isRetryable(lastError, fullConfig)) throw lastError;
      
      const delay = calculateDelay(attempt, fullConfig);
      fullConfig.onRetry?.(lastError, attempt, delay);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

// Circuit breaker
class CircuitBreaker {
  private state = new Map<string, { failures: number; lastFailure: number; state: string }>();
  private readonly threshold = 5;
  private readonly timeout = 60000;

  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const current = this.state.get(key) || { failures: 0, lastFailure: 0, state: "closed" };
    
    if (current.state === "open") {
      if (Date.now() - current.lastFailure > this.timeout) {
        current.state = "half-open";
      } else {
        throw new Error(`Circuit breaker OPEN for ${key}`);
      }
    }
    
    try {
      const result = await operation();
      if (current.state === "half-open") this.state.delete(key);
      return result;
    } catch (error) {
      current.failures++;
      current.lastFailure = Date.now();
      if (current.failures >= this.threshold) current.state = "open";
      this.state.set(key, current);
      throw error;
    }
  }
}

export const circuitBreaker = new CircuitBreaker();

export async function rpcCallWithRetry<T>(rpcCall: () => Promise<T>, method: string): Promise<T> {
  return circuitBreaker.execute(`rpc:${method}`, () =>
    withRetry(rpcCall, {
      maxRetries: 5,
      baseDelayMs: 500,
      onRetry: (err, att, delay) => console.warn(`RPC ${method} retry ${att}/5 after ${delay}ms: ${err.message}`),
    })
  );
}

export async function solanaTransactionWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, {
    maxRetries: 3,
    baseDelayMs: 2000,
    onRetry: (err, att, delay) => console.warn(`Solana tx retry ${att}/3 after ${delay}ms: ${err.message}`),
  });
}
