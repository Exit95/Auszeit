import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { queryKeys } from './keys';
import type { DashboardResponse } from '../types';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: async () => {
      const result = await api.get<DashboardResponse>('/dashboard');
      return result.data;
    },
    refetchInterval: 30 * 1000, // alle 30s im Vordergrund
    refetchIntervalInBackground: false,
  });
}
