import { useState, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseAsyncStateReturn<T> extends AsyncState<T> {
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useAsyncState<T>(): UseAsyncStateReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setState({ data: null, isLoading: true, error: null });
    try {
      const data = await fn();
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, isLoading: false, error });
      return null;
    }
  }, []);

  const reset = useCallback(
    () => setState({ data: null, isLoading: false, error: null }),
    []
  );

  return { ...state, execute, reset };
}
