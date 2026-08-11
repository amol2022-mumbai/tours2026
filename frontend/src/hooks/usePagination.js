import { useState, useCallback } from 'react';

const DEFAULT_LIMIT = 20;

export function usePagination(initialPage = 1, limit = DEFAULT_LIMIT) {
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const updateFromResponse = useCallback((pagination) => {
    if (pagination) {
      setTotal(pagination.total || 0);
      setTotalPages(pagination.pages || 0);
      setPage(pagination.page || 1);
    }
  }, []);

  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || newPage)));
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage]);
  const prevPage = useCallback(() => goToPage(page - 1), [page, goToPage]);
  const reset = useCallback(() => { setPage(1); setTotal(0); setTotalPages(0); }, []);

  return { page, limit, total, totalPages, setPage: goToPage, nextPage, prevPage, reset, updateFromResponse };
}
