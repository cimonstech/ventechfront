'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { RowActionItem } from './types';

function ActionIcon({ label, destructive }: { label: string; destructive?: boolean }) {
  const className = destructive ? 'text-red-600' : 'text-[#3A3A3A]';
  if (destructive || /delete|remove/i.test(label)) return <Trash2 size={16} className={className} aria-hidden />;
  if (/edit/i.test(label)) return <Pencil size={16} className={className} aria-hidden />;
  if (/view|open/i.test(label)) return <Eye size={16} className={className} aria-hidden />;
  return null;
}

export function RowActions({
  name,
  actions,
}: {
  name: string;
  actions: RowActionItem[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const visible = actions.filter((action) => !action.hidden);
  const edit = visible.find((action) => /^edit$/i.test(action.label) && !action.destructive);
  const rest = visible.filter((action) => action !== edit);
  const viewItems = rest.filter((action) => !action.destructive);
  const destroyItems = rest.filter((action) => action.destructive);
  const menuItems = [...viewItems, ...(edit ? [edit] : []), ...destroyItems];

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (visible.length === 0) return null;

  const renderItem = (action: RowActionItem, withDivider: boolean) => {
    const className = `flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm ${
      action.destructive ? 'text-red-600' : 'text-[#1A1A1A]'
    } hover:bg-gray-50`;
    const body = (
      <>
        <ActionIcon label={action.label} destructive={action.destructive} />
        {action.label}
      </>
    );
    return (
      <div key={action.label}>
        {withDivider ? <div className="my-1 border-t border-gray-100" role="separator" /> : null}
        {action.href ? (
          <Link
            href={action.href}
            target={action.target}
            role="menuitem"
            className={className}
            onClick={() => setOpen(false)}
          >
            {body}
          </Link>
        ) : (
          <button
            type="button"
            role="menuitem"
            className={className}
            onClick={() => {
              setOpen(false);
              action.onClick?.();
            }}
          >
            {body}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-end gap-1" ref={wrapRef}>
      {edit ? (
        <div className="hidden md:block">
          {edit.href ? (
            <Link href={edit.href}>
              <Button type="button" variant="outline" size="sm" className="whitespace-nowrap">
                Edit
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={edit.onClick}
            >
              Edit
            </Button>
          )}
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#1A1A1A] hover:bg-gray-100"
          aria-label={`Actions for ${name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal size={20} strokeWidth={2} aria-hidden />
        </button>
        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-30 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          >
            {viewItems.map((action) => renderItem(action, false))}
            {edit ? renderItem(edit, viewItems.length > 0) : null}
            {destroyItems.map((action, index) => renderItem(action, index === 0))}
            {menuItems.length === 0 ? null : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
