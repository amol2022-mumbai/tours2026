import { useState, useEffect, useCallback } from 'react';
import { apiClient as api } from '../api';
import { usePagination } from './usePagination';

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: '', start_date: '', end_date: '' });
  const pagination = usePagination();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.category) params.category = filters.category;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const { data } = await api.get('/expenses', { params });
      setExpenses(data.data);
      pagination.updateFromResponse(data.pagination);
    } catch (err) {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  return { expenses, loading, error, filters, setFilters, pagination, refetch: fetch };
}
