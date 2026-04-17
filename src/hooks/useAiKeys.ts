import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AiKey } from '../lib/types';

export function useAiKeys(tenantId: string) {
  return useQuery({
    queryKey: ['ai-keys', tenantId],
    queryFn: () => api.getAiKeys(tenantId),
    enabled: !!tenantId,
  });
}

export function useCreateAiKey() {
  const queryClient = useQueryClient();
  
  return useMutation<AiKey, Error, { tenantId: string; data: { provider: string; apiKey?: string; creditLimit?: number; limitReset?: string } }>({
    mutationFn: ({ tenantId, data }) =>
      api.createAiKey(tenantId, data),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys', tenantId] });
    },
  });
}

export function useDeleteAiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tenantId, provider }: { tenantId: string; provider: string }) =>
      api.deleteAiKey(tenantId, provider),
    onSuccess: (_data: void, { tenantId }: { tenantId: string; provider: string }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys', tenantId] });
    },
  });
}

export function useDecryptAiKey() {
  return useMutation({
    mutationFn: ({ tenantId, provider }: { tenantId: string; provider: string }) =>
      api.decryptAiKey(tenantId, provider),
  });
}
