import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAuditCycles() {
  return useQuery({
    queryKey: ['audits'],
    queryFn: async () => {
      const { data } = await api.get('/audits');
      return data.cycles;
    },
  });
}

export function useAuditCycle(id) {
  return useQuery({
    queryKey: ['audit', id],
    queryFn: async () => {
      const { data } = await api.get(`/audits/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAuditMutations() {
  const qc = useQueryClient();
  const invalidate = (id) => {
    qc.invalidateQueries({ queryKey: ['audits'] });
    if (id) qc.invalidateQueries({ queryKey: ['audit', id] });
    qc.invalidateQueries({ queryKey: ['assets'] });
  };

  const create = useMutation({
    mutationFn: (body) => api.post('/audits', body).then((r) => r.data.cycle),
    onSuccess: () => invalidate(),
  });
  const verifyItem = useMutation({
    mutationFn: ({ cycleId, itemId, ...body }) =>
      api.patch(`/audits/${cycleId}/items/${itemId}`, body).then((r) => r.data.item),
    onSuccess: (_d, vars) => invalidate(vars.cycleId),
  });
  const close = useMutation({
    mutationFn: (id) => api.post(`/audits/${id}/close`).then((r) => r.data.cycle),
    onSuccess: (_d, id) => invalidate(id),
  });

  return { create, verifyItem, close };
}
