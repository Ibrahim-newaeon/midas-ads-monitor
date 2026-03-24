// src/utils/retry.ts
import { logger } from './logger';

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    label?: string;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 5000, label = 'operation', onRetry } = options;
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt > maxRetries) break;
      const backoff = delayMs * Math.pow(2, attempt - 1);
      logger.warn(`${label} failed (attempt ${attempt}/${maxRetries}) — retry in ${backoff}ms: ${lastError.message}`);
      onRetry?.(attempt, lastError);
      await new Promise(res => setTimeout(res, backoff));
    }
  }

  throw lastError;
}
