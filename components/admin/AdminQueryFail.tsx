'use client';

import { AccessDenied, ErrorState, FeatureOffNote } from '@/components/ui-states';

export function AdminQueryFail({
  featureOff,
  forbidden,
  failed,
  loaded,
  feature,
  onRetry,
  errorTitle,
}: {
  featureOff?: boolean;
  forbidden: boolean;
  failed: boolean;
  loaded: boolean;
  feature?: string;
  onRetry?: () => void;
  errorTitle: string;
}) {
  if (featureOff) {
    return <FeatureOffNote feature={feature || 'This'} />;
  }
  if (forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }
  if (failed && !loaded) {
    return (
      <ErrorState
        title={errorTitle}
        description="Try again in a moment."
        primary={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
      />
    );
  }
  return null;
}
