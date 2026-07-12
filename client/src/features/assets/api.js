import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAssets(params) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  return useQuery({
    queryKey: ['assets', clean],
    queryFn: async () => {
      const { data } = await api.get('/assets', { params: clean });
      return data.assets;
    },
  });
}

export function useAssetProfile(id) {
  return useQuery({
    queryKey: ['asset', id, 'profile'],
    queryFn: async () => {
      const { data } = await api.get(`/assets/${id}/profile`);
      return data;
    },
    enabled: !!id,
  });
}

// Build multipart FormData from a plain object of fields + a FileList.
function toFormData(fields, files) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    fd.append(k, typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);
  });
  if (files) Array.from(files).forEach((f) => fd.append('files', f));
  return fd;
}

export function useAssetMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['assets'] });

  const create = useMutation({
    mutationFn: ({ fields, files }) =>
      api.post('/assets', toFormData(fields, files)).then((r) => r.data.asset),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, fields, files }) =>
      api.patch(`/assets/${id}`, toFormData(fields, files)).then((r) => r.data.asset),
    onSuccess: (_data, vars) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['asset', vars.id] });
    },
  });

  return { create, update };
}
