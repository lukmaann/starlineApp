import { toast } from 'sonner';

interface UndoableActionOptions {
  label: string;
  description?: string;
  durationMs?: number;
  onCommit: () => Promise<void> | void;
  onUndo?: () => void;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const scheduleUndoableAction = ({
  label,
  description,
  durationMs = 5000,
  onCommit,
  onUndo,
  onSuccess,
  onError,
}: UndoableActionOptions) => {
  let isCancelled = false;

  const timer = window.setTimeout(async () => {
    if (isCancelled) return;

    try {
      await onCommit();
      onSuccess?.();
    } catch (error) {
      onError?.(error);
    }
  }, durationMs);

  toast(label, {
    description: description || 'This action will complete shortly.',
    duration: durationMs,
    action: {
      label: 'Undo',
      onClick: () => {
        isCancelled = true;
        window.clearTimeout(timer);
        onUndo?.();
        toast.info('Action cancelled');
      },
    },
  });

  return () => {
    isCancelled = true;
    window.clearTimeout(timer);
  };
};
