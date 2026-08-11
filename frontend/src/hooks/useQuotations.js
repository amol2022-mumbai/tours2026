import { useState, useEffect, useCallback } from 'react';
import { quotationsApi } from '../api/quotationsApi';
import { usePagination } from './usePagination';

export function useQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const pagination = usePagination();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const { data } = await quotationsApi.list(params);
      setQuotations(data.data);
      pagination.updateFromResponse(data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    pagination.setPage(1);
  }, [pagination]);

  const createQuotation = useCallback(async (data) => {
    await quotationsApi.create(data);
    fetch();
  }, [fetch]);

  const updateStatus = useCallback(async (id, status) => {
    await quotationsApi.updateStatus(id, status);
    fetch();
  }, [fetch]);

  const deleteQuotation = useCallback(async (id) => {
    await quotationsApi.remove(id);
    fetch();
  }, [fetch]);

  return { quotations, loading, error, filters, setFilter, pagination, createQuotation, updateStatus, deleteQuotation, refetch: fetch };
}
