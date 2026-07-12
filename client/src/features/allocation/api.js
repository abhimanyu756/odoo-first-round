import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAllocations(params) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  return useQuery({
    queryKey: ['allocations', clean],
    queryFn: async () => {
      const { data } = await api.get('/allocations', { params: clean });
      return data.allocations;
    },
  });
}

export function useTransfers(params) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  return useQuery({
    queryKey: ['transfers', clean],
    queryFn: async () => {
      const { data } = await api.get('/transfers', { params: clean });
      return data.transfers;
    },
  });
}

export function useAllocationMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['allocations'] });
    qc.invalidateQueries({ queryKey: ['transfers'] });
    qc.invalidateQueries({ queryKey: ['assets'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const allocate = useMutation({
    mutationFn: (body) => api.post('/allocations', body).then((r) => r.data.allocation),
    onSuccess: invalidateAll,
  });
  const returnAsset = useMutation({
    mutationFn: ({ id, ...body }) => api.post(`/allocations/${id}/return`, body).then((r) => r.data.allocation),
    onSuccess: invalidateAll,
  });
  const createTransfer = useMutation({
    mutationFn: (body) => api.post('/transfers', body).then((r) => r.data.transfer),
    onSuccess: invalidateAll,
  });
  const decideTransfer = useMutation({
    mutationFn: ({ id, decision }) => api.post(`/transfers/${id}/decide`, { decision }).then((r) => r.data.transfer),
    onSuccess: invalidateAll,
  });

  return { allocate, returnAsset, createTransfer, decideTransfer };
}
