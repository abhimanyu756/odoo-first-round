import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useBookings(params) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  return useQuery({
    queryKey: ['bookings', clean],
    queryFn: async () => {
      const { data } = await api.get('/bookings', { params: clean });
      return data.bookings;
    },
  });
}

export function useBookingMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const create = useMutation({
    mutationFn: (body) => api.post('/bookings', body).then((r) => r.data.booking),
    onSuccess: invalidate,
  });
  const reschedule = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/bookings/${id}/reschedule`, body).then((r) => r.data.booking),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (id) => api.post(`/bookings/${id}/cancel`).then((r) => r.data.booking),
    onSuccess: invalidate,
  });

  return { create, reschedule, cancel };
}
