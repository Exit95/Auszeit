import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { queryKeys } from './keys';
import type { Review } from '../types';

export function useReviews() {
  return useQuery({
    queryKey: queryKeys.reviews.all,
    queryFn: async () => {
      const data = await adminApi.get<Review[]>('/api/reviews', { all: 'true' });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
  });
}

export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminApi.patch('/api/reviews', { id, approved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}

export function useRejectReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminApi.patch('/api/reviews', { id, approved: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      adminApi.delete(`/api/reviews?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}
