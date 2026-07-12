import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data } = await api.get('/reports');
      return data;
    },
  });
}
