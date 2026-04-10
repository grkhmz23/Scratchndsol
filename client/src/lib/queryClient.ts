import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { randomUUID } from "@/lib/utils";

// Generate or retrieve idempotency key for mutations
let currentIdempotencyKey: string | null = null;

export function getIdempotencyKey(): string {
  if (!currentIdempotencyKey) {
    currentIdempotencyKey = randomUUID();
  }
  return currentIdempotencyKey;
}

export function resetIdempotencyKey(): void {
  currentIdempotencyKey = randomUUID();
}

// Retry configuration with exponential backoff
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  shouldRetry: (error: any): boolean => {
    // Don't retry client errors (4xx)
    if (error.status >= 400 && error.status < 500) return false;
    // Retry server errors and network errors
    return true;
  },
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: res.statusText };
    }
    
    const error = new Error(errorData.message || `HTTP ${res.status}`) as any;
    error.status = res.status;
    error.code = errorData.error || "UNKNOWN_ERROR";
    error.data = errorData;
    throw error;
  }
}

// Enhanced API request with retry logic
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  useIdempotency: boolean = false,
): Promise<Response> {
  let lastError: any;
  
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add idempotency key for state-changing operations
  if (useIdempotency && ["POST", "PUT", "PATCH"].includes(method)) {
    headers["X-Idempotency-Key"] = getIdempotencyKey();
  }
  
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      await throwIfResNotOk(res);
      
      // Reset idempotency key on success
      if (useIdempotency) {
        resetIdempotencyKey();
      }
      
      return res;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if aborted
      if (error.name === "AbortError") {
        throw new Error("Request timeout. Please try again.");
      }
      
      // Check if we should retry
      if (!RETRY_CONFIG.shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt) * (0.5 + Math.random());
        console.warn(`Request failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Query client with enhanced configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry 4xx errors
        if (error.status >= 400 && error.status < 500) return false;
        // Retry others up to 3 times
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Prefetch helper with cache management
export async function prefetchData<T>(
  queryKey: string[],
  fetcher: () => Promise<T>,
  staleTime: number = 5 * 60 * 1000
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: fetcher,
    staleTime,
  });
}

// Invalidate queries helper
export function invalidateQueries(pattern: string): void {
  queryClient.invalidateQueries({ queryKey: [pattern] });
}
