'use client';

import { useEffect, useId, useRef } from 'react';

export function FilePick({
  accept,
  file,
  onFile,
  label = 'Choose file',
  emptyLabel = 'No file chosen',
  disabled = false,
}: {
  accept?: string;
  file: File | null;
  onFile: (file: File | null) => void;
  label?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = '';
  }, [file]);

  return (
    <div className="min-w-0 max-w-full">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0] || null)}
      />
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-[#1A1A1A] disabled:opacity-50"
          onClick={() => inputRef.current?.click()}
        >
          {label}
        </button>
        <span className="min-w-0 truncate text-sm text-[#3A3A3A]" title={file?.name}>
          {file ? file.name : emptyLabel}
        </span>
      </div>
    </div>
  );
}
