import { useState, useCallback } from 'react';
import { PAGE_SIZE_DEFAULT } from '@/shared/constants';

interface PaginationState {
  page: number;
  pageSize: number;
}

interface UsePaginationReturn extends PaginationState {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
  hasNext: (total: number) => boolean;
  hasPrev: () => boolean;
}

export function usePagination(initialPageSize = PAGE_SIZE_DEFAULT): UsePaginationReturn {
  const [state, setState] = useState<PaginationState>({ page: 1, pageSize: initialPageSize });

  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), []);
  const setPageSize = useCallback(
    (pageSize: number) => setState({ page: 1, pageSize }),
    []
  );
  const nextPage = useCallback(() => setState((s) => ({ ...s, page: s.page + 1 })), []);
  const prevPage = useCallback(
    () => setState((s) => ({ ...s, page: Math.max(1, s.page - 1) })),
    []
  );
  const reset = useCallback(() => setState((s) => ({ ...s, page: 1 })), []);

  const hasNext = useCallback(
    (total: number) => state.page * state.pageSize < total,
    [state]
  );
  const hasPrev = useCallback(() => state.page > 1, [state.page]);

  return { ...state, setPage, setPageSize, nextPage, prevPage, reset, hasNext, hasPrev };
}
