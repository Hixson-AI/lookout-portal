import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

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
  
  return useMutation({
    mutationFn: ({ tenantId, label }: { tenantId: string; label: string }) =>
      api.createApiKey(tenantId, label),
    onSuccess: (_data: any, { tenantId }: { tenantId: string; label: string }) => {
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
