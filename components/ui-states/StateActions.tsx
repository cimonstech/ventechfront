'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
}

export function StateActions({
  primary,
  secondary,
}: {
  primary?: StateAction;
  secondary?: StateAction;
}) {
  if (!primary && !secondary) return null;

  const render = (action: StateAction, key: string) => {
    const button = (
      <Button
        type="button"
        variant={action.variant || (key === 'primary' ? 'primary' : 'outline')}
        className="w-full min-h-11 sm:w-auto"
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    );
    if (action.href) {
      return (
        <Link key={key} href={action.href} className="w-full sm:w-auto">
          {button}
        </Link>
      );
    }
    return <span key={key} className="w-full sm:w-auto">{button}</span>;
  };

  return (
    <div className="mt-6 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
      {primary ? render(primary, 'primary') : null}
      {secondary ? render(secondary, 'secondary') : null}
    </div>
  );
}
