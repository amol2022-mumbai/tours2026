import { useState, useEffect, useCallback } from 'react';
import { leadsApi } from '../api/leadsApi';
import { usePagination } from './usePagination';

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', source: '', search: '' });
  const pagination = usePagination();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.search) params.search = filters.search;
      const { data } = await leadsApi.list(params);
      setLeads(data.data);
      pagination.updateFromResponse(data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    pagination.setPage(1);
  }, [pagination]);

  const createLead = useCallback(async (data) => {
    await leadsApi.create(data);
    fetch();
  }, [fetch]);

  const updateLead = useCallback(async (id, data) => {
    await leadsApi.update(id, data);
    fetch();
  }, [fetch]);

  const deleteLead = useCallback(async (id) => {
    await leadsApi.remove(id);
    fetch();
  }, [fetch]);

  return { leads, loading, error, filters, setFilter, pagination, createLead, updateLead, deleteLead, refetch: fetch };
}
