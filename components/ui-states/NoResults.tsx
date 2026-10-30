'use client';

import { SearchX } from 'lucide-react';
import { StateAction, StateActions } from './StateActions';

export function NoResults({
  query,
  title,
  description,
  primary,
  secondary,
}: {
  query?: string;
  title?: string;
  description?: string;
  primary?: StateAction;
  secondary?: StateAction;
}) {
  const heading = title || (query ? `No results for “${query}”` : 'No matching results');
  const copy =
    description ||
    'Try a different spelling, a shorter term, or clear filters.';

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-[#3A3A3A]">
        <SearchX className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#1A1A1A]">{heading}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#3A3A3A]">{copy}</p>
      <StateActions primary={primary} secondary={secondary} />
    </div>
  );
}
