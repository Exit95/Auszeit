import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { queryKeys } from './keys';
import type { Inquiry, InquiryStatus } from '../types';

export function useInquiries() {
  return useQuery({
    queryKey: queryKeys.inquiries.all,
    queryFn: async () => {
      const data = await adminApi.get<Inquiry[]>('/api/inquiries');
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });
}

interface UpdateInquiryVars {
  id: string;
  status?: InquiryStatus;
  adminNotes?: string;
}

export function useUpdateInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: UpdateInquiryVars) => adminApi.put<Inquiry>('/api/inquiries', vars),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inquiries.all });
      qc.invalidateQueries({ queryKey: queryKeys.inquiries.detail(vars.id) });
    },
  });
}
