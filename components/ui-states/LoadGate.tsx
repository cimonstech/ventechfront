'use client';

import type { ReactNode } from 'react';
import { AccessDenied } from './AccessDenied';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { NoResults } from './NoResults';
import { UpdatingNotice } from './UpdatingNotice';
import type { StateAction } from './StateActions';

export function LoadGate({
  loaded,
  loading,
  updating = false,
  error,
  forbidden = false,
  isEmpty,
  filtered = false,
  onRetry,
  onClearFilters,
  skeleton,
  emptyTitle,
  emptyDescription,
  emptyPrimary,
  denyHome = '/account',
  children,
}: {
  loaded: boolean;
  loading: boolean;
  updating?: boolean;
  error: boolean;
  forbidden?: boolean;
  isEmpty: boolean;
  filtered?: boolean;
  onRetry: () => void;
  onClearFilters?: () => void;
  skeleton?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyPrimary?: StateAction;
  denyHome?: string;
  children: ReactNode;
}) {
  if (forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: denyHome }}
      />
    );
  }

  if (error && !loaded) {
    return (
      <ErrorState
        title="We couldn't load this"
        description="Something went wrong. Try again, or come back in a moment."
        primary={{ label: 'Try again', onClick: onRetry }}
      />
    );
  }

  if (loading && !loaded) {
    return <>{skeleton}</>;
  }

  if (loaded && isEmpty && filtered) {
    return (
      <>
        {updating ? <UpdatingNotice /> : null}
        <NoResults
          primary={onClearFilters ? { label: 'Clear filters', onClick: onClearFilters } : undefined}
        />
      </>
    );
  }

  if (loaded && isEmpty) {
    return (
      <>
        {updating ? <UpdatingNotice /> : null}
        <EmptyState title={emptyTitle} description={emptyDescription} primary={emptyPrimary} />
      </>
    );
  }

  return (
    <>
      {updating ? <UpdatingNotice /> : null}
      {error && loaded ? (
        <div
          className="mb-4 flex flex-col items-stretch gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="text-sm text-red-800">We couldn&apos;t refresh this. Your last loaded data is still here.</p>
          <button
            type="button"
            className="min-h-11 text-sm font-semibold text-red-800 underline"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
