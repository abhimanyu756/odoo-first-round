import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.notifications;
    },
    refetchInterval: 30_000,
  });
}

export function useActivityLog(params) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
  return useQuery({
    queryKey: ['activity', clean],
    queryFn: async () => {
      const { data } = await api.get('/activity', { params: clean });
      return data.logs;
    },
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all').then((r) => r.data),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}
