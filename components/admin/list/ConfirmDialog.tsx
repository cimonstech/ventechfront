'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <div className="flex flex-row justify-end gap-2">
          <Button variant="ghost" className="min-w-0 flex-1 whitespace-nowrap sm:flex-none sm:w-auto" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="min-w-0 flex-1 whitespace-nowrap sm:flex-none sm:w-auto"
            onClick={onConfirm}
            isLoading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm leading-6 text-[#3A3A3A]">{children}</div>
    </Sheet>
  );
}
