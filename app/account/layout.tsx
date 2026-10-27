import { Suspense } from 'react';
import { AccountShell } from '@/components/account/AccountShell';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center text-sm text-[#3A3A3A]">Loading your account…</div>}>
      <AccountShell>{children}</AccountShell>
    </Suspense>
  );
}
