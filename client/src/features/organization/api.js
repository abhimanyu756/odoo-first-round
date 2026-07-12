import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Departments ───────────────────────────────────────────────
export function useDepartments(params) {
  return useQuery({
    queryKey: ['departments', params],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params });
      return data.departments;
    },
  });
}

export function useDepartmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const create = useMutation({
    mutationFn: (body) => api.post('/departments', body).then((r) => r.data.department),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/departments/${id}`, body).then((r) => r.data.department),
    onSuccess: invalidate,
  });
  const deactivate = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`).then((r) => r.data),
    onSuccess: invalidate,
  });
  return { create, update, deactivate };
}

// ─── Categories ────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data.categories;
    },
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const create = useMutation({
    mutationFn: (body) => api.post('/categories', body).then((r) => r.data.category),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/categories/${id}`, body).then((r) => r.data.category),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`).then((r) => r.data),
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

// ─── Employees ─────────────────────────────────────────────────
export function useEmployees(params) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async () => {
      const { data } = await api.get('/employees', { params });
      return data.employees;
    },
  });
}

export function useEmployeeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['employees'] });

  const create = useMutation({
    mutationFn: (body) => api.post('/employees', body).then((r) => r.data.employee),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/employees/${id}`, body).then((r) => r.data.employee),
    onSuccess: invalidate,
  });
  const updateRole = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/employees/${id}/role`, { role }).then((r) => r.data.employee),
    onSuccess: invalidate,
  });
  return { create, update, updateRole };
}
