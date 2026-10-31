'use client';

export function UpdatingNotice({ label = 'Updating' }: { label?: string }) {
  return (
    <p className="mb-3 text-xs text-[#3A3A3A]" role="status">
      {label}
    </p>
  );
}
