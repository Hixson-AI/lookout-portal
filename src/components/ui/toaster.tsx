import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast: 'toast',
          description: 'toast-description',
          actionButton: 'toast-action',
          cancelButton: 'toast-cancel',
        },
      }}
    />
  );
}
