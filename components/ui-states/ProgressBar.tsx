'use client';

export function ProgressBar({
  value,
  label = 'Loading',
  className = '',
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs text-[#3A3A3A]">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[#FF7A19] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
