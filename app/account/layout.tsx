import { Suspense } from 'react';
import { AccountShell } from '@/components/account/AccountShell';
import { LoadingMessage } from '@/components/ui-states';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingMessage label="Loading your account" />}>
      <AccountShell>{children}</AccountShell>
    </Suspense>
  );
}
