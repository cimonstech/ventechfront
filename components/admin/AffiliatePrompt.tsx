'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

export function AffiliatePrompt({
  title,
  label,
  submitLabel,
  placeholder,
  note,
  busy,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  submitLabel: string;
  placeholder?: string;
  note?: ReactNode;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState('');

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={(
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            isLoading={busy}
            disabled={busy || !value.trim()}
            onClick={() => onSubmit(value.trim())}
          >
            {submitLabel}
          </Button>
        </div>
      )}
    >
      {note}
      <label className="mt-3 block text-sm text-[#3A3A3A]">
        {label}
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={3}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1A1A1A]"
        />
      </label>
    </Sheet>
  );
}
