import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMaintenance(params) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  return useQuery({
    queryKey: ['maintenance', clean],
    queryFn: async () => {
      const { data } = await api.get('/maintenance', { params: clean });
      return data.requests;
    },
  });
}

export function useMaintenanceMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['maintenance'] });
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Raise request as multipart (optional photo).
  const create = useMutation({
    mutationFn: ({ fields, photo }) => {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => v != null && v !== '' && fd.append(k, v));
      if (photo) fd.append('photo', photo);
      return api.post('/maintenance', fd).then((r) => r.data.request);
    },
    onSuccess: invalidate,
  });

  const transition = useMutation({
    mutationFn: ({ id, ...body }) => api.post(`/maintenance/${id}/transition`, body).then((r) => r.data.request),
    onSuccess: invalidate,
  });

  return { create, transition };
}
