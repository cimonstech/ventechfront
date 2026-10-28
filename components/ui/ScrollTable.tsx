import type { ReactNode } from 'react';

export function ScrollTable({
  children,
  className = '',
  minWidth,
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className={`max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] ${className}`}>
      <div style={minWidth ? { minWidth } : undefined} className={minWidth ? '' : 'min-w-full'}>
        {children}
      </div>
    </div>
  );
}

export function StackRows({
  rows,
  className = '',
}: {
  rows: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-[#3A3A3A]">{row.label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-[#1A1A1A]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
