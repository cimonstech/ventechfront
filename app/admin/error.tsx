'use client';

import { ErrorState } from '@/components/ui-states';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[40vh]">
      <ErrorState
        title="Something went wrong on this page"
        description="Your information is safe. Try again, or go back to the home page."
        primary={{ label: 'Try again', onClick: () => reset() }}
        secondary={{ label: 'Go to home', href: '/' }}
      />
      {error.digest ? (
        <p className="pb-8 text-center text-xs text-[#3A3A3A]">
          Reference for support: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
