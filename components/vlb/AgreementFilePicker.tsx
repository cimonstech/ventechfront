'use client';

import { useRef } from 'react';
import { FieldError, FieldHint, ProgressBar } from '@/components/ui-states';

export type AgreementFileProgress = {
  name: string;
  status: 'queued' | 'uploading' | 'done' | 'error';
  message?: string;
  percent?: number;
};

export function AgreementFilePicker({
  files,
  onFiles,
  error,
  progress,
  disabled = false,
}: {
  files: File[];
  onFiles: (files: File[]) => void;
  error?: string | null;
  progress?: AgreementFileProgress[];
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (!next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
        next.push(file);
      }
    }
    onFiles(next.slice(0, 10));
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  return (
    <div className="min-w-0 space-y-2">
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif"
        multiple
        disabled={disabled}
        onChange={(event) => add(event.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        className="sr-only"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(event) => add(event.target.files)}
      />
      <div className="flex min-w-0 flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-[#1A1A1A] disabled:opacity-50"
          onClick={() => fileRef.current?.click()}
        >
          Choose files
        </button>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-[#1A1A1A] disabled:opacity-50"
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </button>
      </div>
      {files.length > 0 ? (
        <ul className="space-y-1 text-sm text-[#3A3A3A]">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 truncate">{file.name}</span>
              <button
                type="button"
                className="shrink-0 text-[#FF7A19]"
                disabled={disabled}
                onClick={() => onFiles(files.filter((_, item) => item !== index))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <FieldHint message="PDF, or up to 10 photos (JPG, PNG or HEIC). 10 MB each." />
      )}
      {progress?.map((item) => (
        <div key={item.name}>
          {item.status === 'uploading' ? (
            <ProgressBar value={item.percent ?? 40} label={`Uploading ${item.name}`} />
          ) : item.status === 'error' ? (
            <FieldError message={item.message || `Could not upload ${item.name}.`} />
          ) : item.status === 'done' ? (
            <p className="text-sm text-green-700">{item.name} uploaded.</p>
          ) : null}
        </div>
      ))}
      <FieldError message={error} />
    </div>
  );
}
