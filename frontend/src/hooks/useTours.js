import { useState, useEffect, useCallback } from 'react';
import { toursApi } from '../api/toursApi';
import { usePagination } from './usePagination';

export function useTours() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const pagination = usePagination();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await toursApi.list({ page: pagination.page, limit: pagination.limit, search });
      setTours(data.data);
      pagination.updateFromResponse(data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tours');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const setSearchValue = useCallback((value) => {
    setSearch(value);
    pagination.setPage(1);
  }, [pagination]);

  const createTour = useCallback(async (data) => {
    await toursApi.create(data);
    fetch();
  }, [fetch]);

  const updateTour = useCallback(async (id, data) => {
    await toursApi.update(id, data);
    fetch();
  }, [fetch]);

  const deleteTour = useCallback(async (id) => {
    await toursApi.remove(id);
    fetch();
  }, [fetch]);

  return { tours, loading, error, search, setSearch: setSearchValue, pagination, createTour, updateTour, deleteTour, refetch: fetch };
}
