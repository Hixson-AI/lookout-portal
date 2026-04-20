import type { Toast } from '../../hooks/useToast';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

const icons = {
  success: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const borders = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 max-w-sm w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md text-sm animate-in slide-in-from-bottom-2 ${borders[t.variant]}`}
        >
          {icons[t.variant]}
          <span className="flex-1 text-gray-800">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
