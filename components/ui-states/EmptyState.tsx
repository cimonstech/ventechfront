'use client';

import type { ComponentType } from 'react';
import { Inbox } from 'lucide-react';
import { StateAction, StateActions } from './StateActions';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  primary,
  secondary,
}: {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  primary?: StateAction;
  secondary?: StateAction;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-[#3A3A3A]">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#1A1A1A]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#3A3A3A]">{description}</p>
      <StateActions primary={primary} secondary={secondary} />
    </div>
  );
}
