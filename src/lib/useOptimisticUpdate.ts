import { useCallback } from 'react';
import { toast } from './toast';

interface UseOptimisticUpdateOptions<T> {
  onMutate: (item: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useOptimisticUpdate<T>(options: UseOptimisticUpdateOptions<T>) {
  const { onMutate, onSuccess, onError } = options;

  const execute = useCallback(
    async (item: T, rollback: () => void) => {
      try {
        await onMutate(item);
        onSuccess?.();
      } catch (error) {
        rollback();
        onError?.(error as Error);
        toast.error('Operation failed', { description: (error as Error).message });
      }
    },
    [onMutate, onSuccess, onError],
  );

  return { execute };
}
