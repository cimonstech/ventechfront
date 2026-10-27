'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function AffiliatePrompt({
  title,
  label,
  submitLabel,
  placeholder,
  busy,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  submitLabel: string;
  placeholder?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        <h3 className="text-lg font-bold text-[#1A1A1A]">{title}</h3>
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
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={busy}
            disabled={busy || !value.trim()}
            onClick={() => onSubmit(value.trim())}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
