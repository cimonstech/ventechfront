'use client';

import type { ReactNode } from 'react';
import type { TableFact } from './types';

export function ResponsiveTable({
  headers,
  children,
  cards,
}: {
  headers: ReactNode;
  children: ReactNode;
  cards: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="space-y-3 md:hidden">{cards}</div>
      <div className="hidden max-w-full overflow-x-auto overscroll-x-contain md:block sticky-first rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-[#3A3A3A]">
            {headers}
          </thead>
          <tbody className="divide-y divide-gray-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminRowCard({
  name,
  thumbnail,
  facts,
  status,
  actions,
  href,
}: {
  name: string;
  thumbnail?: string | null;
  facts?: TableFact[];
  status?: ReactNode;
  actions?: ReactNode;
  href?: string;
}) {
  const title = (
    <p className="line-clamp-2 text-sm font-semibold text-[#1A1A1A]">{name}</p>
  );

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {thumbnail !== undefined ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {href ? (
            <a href={href} className="hover:underline">
              {title}
            </a>
          ) : (
            title
          )}
          {status ? <div className="mt-2">{status}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {facts && facts.length > 0 ? (
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="text-[#3A3A3A]">{fact.label}</dt>
              <dd className="min-w-0 text-right font-medium text-[#1A1A1A]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
