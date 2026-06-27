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
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}
