import { useState, useEffect, useCallback } from 'react';
import { bookingsApi } from '../api/bookingsApi';
import { usePagination } from './usePagination';

export function useBookings() {
  const [bookings, setBookings] = useState([]);
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
      const { data } = await bookingsApi.list(params);
      setBookings(data.data);
      pagination.updateFromResponse(data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    pagination.setPage(1);
  }, [pagination]);

  const createBooking = useCallback(async (data) => {
    await bookingsApi.create(data);
    fetch();
  }, [fetch]);

  const updateStatus = useCallback(async (id, status) => {
    await bookingsApi.updateStatus(id, status);
    fetch();
  }, [fetch]);

  return { bookings, loading, error, filters, setFilter, pagination, createBooking, updateStatus, refetch: fetch };
}
