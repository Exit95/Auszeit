import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { queryKeys } from './keys';
import type { BlockedDate } from '../types';

export function useBlockedDates() {
  return useQuery({
    queryKey: queryKeys.blockedDates.all,
    queryFn: async () => {
      const data = await adminApi.get<BlockedDate[]>('/api/admin/blocked-dates');
      return Array.isArray(data) ? data : [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAddBlockedDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { from: string; to: string; reason?: string }) =>
      adminApi.post('/api/admin/blocked-dates', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedDates.all });
    },
  });
}

export function useDeleteBlockedDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminApi.delete('/api/admin/blocked-dates', { body: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedDates.all });
    },
  });
}
