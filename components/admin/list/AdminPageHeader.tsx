'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AdminAction } from './types';

function ActionButton({
  action,
  variant,
  className = '',
}: {
  action: AdminAction;
  variant: 'primary' | 'outline';
  className?: string;
}) {
  const button = (
    <Button
      type="button"
      variant={variant}
      size="sm"
      icon={action.icon}
      disabled={action.disabled}
      onClick={action.onClick}
      className={`max-w-full whitespace-nowrap ${className}`}
    >
      {action.label}
    </Button>
  );
  if (action.href) {
    const grow = className.includes('flex-1') || className.includes('w-full');
    return (
      <Link
        href={action.href}
        className={grow ? 'block min-w-0 max-w-full flex-1 sm:flex-none' : 'inline-flex min-w-0 max-w-full'}
      >
        {button}
      </Link>
    );
  }
  return button;
}

export function AdminPageHeader({
  title,
  subtitle,
  backHref = '/admin',
  backLabel = 'Dashboard',
  primary,
  secondary = [],
  extra,
}: {
  title: string;
  subtitle?: string;
  backHref?: string | null;
  backLabel?: string;
  primary?: AdminAction;
  secondary?: AdminAction[];
  extra?: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreId = useId();

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreOpen]);

  return (
    <div className="mb-6 min-w-0 max-w-full">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[#FF7A19] hover:underline"
        >
          <ChevronLeft size={18} className="shrink-0" aria-hidden />
          {backLabel}
        </Link>
      ) : null}

      <div className="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="min-w-0 break-words text-2xl font-bold text-[#1A1A1A]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[#3A3A3A]">{subtitle}</p> : null}
        </div>

        {(primary || secondary.length > 0 || extra) && (
          <div className="flex min-w-0 max-w-full flex-row flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {extra}
            {primary ? (
              <ActionButton
                action={primary}
                variant="primary"
                className="min-w-0 max-w-full flex-1 sm:flex-none"
              />
            ) : null}

            {secondary.length > 0 ? (
              <>
                <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
                  {secondary.map((action) => (
                    <ActionButton key={action.label} action={action} variant="outline" />
                  ))}
                </div>
                {secondary.length === 1 ? (
                  <div className="min-w-0 w-full sm:hidden">
                    <ActionButton
                      action={secondary[0]}
                      variant="outline"
                      className="w-full min-w-0 max-w-full"
                    />
                  </div>
                ) : (
                  <div className="relative ml-auto shrink-0 sm:hidden" ref={moreRef}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 w-11 min-h-11 min-w-11 shrink-0 p-0"
                      aria-label="More"
                      aria-haspopup="menu"
                      aria-expanded={moreOpen}
                      aria-controls={moreId}
                      onClick={() => setMoreOpen((open) => !open)}
                    >
                      <MoreHorizontal size={20} className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                    </Button>
                    {moreOpen ? (
                      <div
                        id={moreId}
                        role="menu"
                        className="absolute right-0 z-20 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                      >
                        {secondary.map((action) => {
                          const itemClass =
                            'flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm text-[#1A1A1A] hover:bg-gray-50 disabled:opacity-50';
                          if (action.href) {
                            return (
                              <Link
                                key={action.label}
                                href={action.href}
                                role="menuitem"
                                className={itemClass}
                                onClick={() => setMoreOpen(false)}
                              >
                                {action.icon}
                                {action.label}
                              </Link>
                            );
                          }
                          return (
                            <button
                              key={action.label}
                              type="button"
                              role="menuitem"
                              className={itemClass}
                              disabled={action.disabled}
                              onClick={() => {
                                setMoreOpen(false);
                                action.onClick?.();
                              }}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
