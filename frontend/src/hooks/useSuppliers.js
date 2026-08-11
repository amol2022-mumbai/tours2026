import { useState, useEffect, useCallback } from 'react';
import { apiClient as api } from '../api';
import { usePagination } from './usePagination';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ type: '', search: '' });
  const pagination = usePagination();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/suppliers', { params });
      setSuppliers(data.data);
      pagination.updateFromResponse(data.pagination);
    } catch (err) {
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    pagination.setPage(1);
  }, [pagination]);

  const createSupplier = useCallback(async (data) => {
    await api.post('/suppliers', data);
    fetch();
  }, [fetch]);

  const updateSupplier = useCallback(async (id, data) => {
    await api.put(`/suppliers/${id}`, data);
    fetch();
  }, [fetch]);

  const deleteSupplier = useCallback(async (id) => {
    await api.delete(`/suppliers/${id}`);
    fetch();
  }, [fetch]);

  return { suppliers, loading, error, filters, setFilter, pagination, createSupplier, updateSupplier, deleteSupplier, refetch: fetch };
}
