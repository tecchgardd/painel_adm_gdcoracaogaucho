import { useCallback, useEffect, useRef, useState } from 'react';

type Options<T> = {
  enabled?: boolean;
  fallbackData?: T;
};

export function useApiQuery<T>(queryFn: () => Promise<T>, options: Options<T> = {}) {
  const { enabled = true, fallbackData } = options;
  const fallbackRef = useRef(fallbackData);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fallbackRef.current = fallbackData;
  }, [fallbackData]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Erro ao carregar dados.';
      const currentFallback = fallbackRef.current;
      if ((err as { status?: number })?.status === 404 && Array.isArray(currentFallback)) {
        setError(null);
        setData([] as T);
        return;
      }
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, queryFn]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
