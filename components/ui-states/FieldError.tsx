import { AlertCircle } from 'lucide-react';

export function FieldError({
  id,
  message,
}: {
  id?: string;
  message?: string | null;
}) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

export function FieldHint({
  id,
  message,
}: {
  id?: string;
  message?: string | null;
}) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-[#3A3A3A]">
      {message}
    </p>
  );
}
