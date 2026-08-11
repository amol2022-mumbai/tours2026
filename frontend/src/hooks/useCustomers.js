import { useState, useEffect, useCallback } from 'react';
import { customersApi } from '../api/customersApi';
import { usePagination } from './usePagination';

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const pagination = usePagination();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customersApi.list({ page: pagination.page, limit: pagination.limit, search });
      setCustomers(data.data);
      pagination.updateFromResponse(data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const setSearchValue = useCallback((value) => {
    setSearch(value);
    pagination.setPage(1);
  }, [pagination]);

  const createCustomer = useCallback(async (data) => {
    await customersApi.create(data);
    fetch();
  }, [fetch]);

  const updateCustomer = useCallback(async (id, data) => {
    await customersApi.update(id, data);
    fetch();
  }, [fetch]);

  const deleteCustomer = useCallback(async (id) => {
    await customersApi.remove(id);
    fetch();
  }, [fetch]);

  return { customers, loading, error, search, setSearch: setSearchValue, pagination, createCustomer, updateCustomer, deleteCustomer, refetch: fetch };
}
