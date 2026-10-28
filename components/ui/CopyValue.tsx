'use client';

import toast from 'react-hot-toast';

export function CopyValue({
  value,
  className = '',
}: {
  value: string;
  className?: string;
}) {
  if (!value) return <span className="text-[#3A3A3A]">—</span>;

  const copy = () => {
    void navigator.clipboard.writeText(value).then(
      () => toast.success('Copied'),
      () => toast.error('Could not copy')
    );
  };

  return (
    <span className={`inline-flex max-w-full min-w-0 items-center gap-2 ${className}`}>
      <span className="min-w-0 break-all">{value}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-[#FF7A19] hover:bg-orange-50 md:min-h-0 md:min-w-0 md:px-1"
      >
        Copy
      </button>
    </span>
  );
}
