import { useCallback } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';

export function useOptimisticUpdate<T>() {
  const qc = useQueryClient();

  const optimisticUpdate = useCallback(
    async (
      queryKey: QueryKey,
      updater: (old: T) => T,
      mutation: () => Promise<unknown>
    ) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<T>(queryKey);
      qc.setQueryData<T>(queryKey, updater);

      try {
        await mutation();
      } catch (err) {
        qc.setQueryData<T>(queryKey, prev);
        throw err;
      } finally {
        qc.invalidateQueries({ queryKey });
      }
    },
    [qc]
  );

  return { optimisticUpdate };
}
