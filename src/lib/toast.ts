import { toast as sonner } from 'sonner';

export const toast = {
  success: (msg: string, opts?: { description?: string }) =>
    sonner.success(msg, opts),
  error: (msg: string, opts?: { description?: string }) =>
    sonner.error(msg, opts),
  info: (msg: string, opts?: { description?: string }) =>
    sonner(msg, opts),
  undo: (
    msg: string,
    onUndo: () => void,
    opts?: { description?: string; duration?: number },
  ) =>
    sonner(msg, {
      ...opts,
      duration: opts?.duration ?? 5000,
      action: {
        label: 'Undo',
        onClick: onUndo,
      },
    }),
};
