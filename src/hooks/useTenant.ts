import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CreateApiKeyResponse } from '../lib/types';

export function useTenant(id: string) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => api.getTenant(id),
    enabled: !!id,
  });
}

export function useApiKeys(tenantId: string) {
  return useQuery({
    queryKey: ['api-keys', tenantId],
    queryFn: () => api.getApiKeys(tenantId),
    enabled: !!tenantId,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation<CreateApiKeyResponse, Error, { tenantId: string; label: string }>({
    mutationFn: ({ tenantId, label }) =>
      api.createApiKey(tenantId, label),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', tenantId] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tenantId, keyId }: { tenantId: string; keyId: string }) =>
      api.deleteApiKey(tenantId, keyId),
    onSuccess: (_data: void, { tenantId }: { tenantId: string; keyId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', tenantId] });
    },
  });
}
