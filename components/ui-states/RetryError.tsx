'use client';

import { ErrorState } from './ErrorState';

export function RetryError({
  title = "We couldn't load this",
  description = 'Something went wrong. Try again, or come back in a moment.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <ErrorState
      title={title}
      description={description}
      primary={{ label: 'Try again', onClick: () => window.location.reload() }}
    />
  );
}
