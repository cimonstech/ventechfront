'use client';

import Link from 'next/link';
import { InfoNote } from '@/components/ui/InfoNote';
import { useAccess } from '@/context/AccessContext';

export function FeatureOffNote({
  feature,
  customer = false,
}: {
  feature: string;
  customer?: boolean;
}) {
  const { access } = useAccess();
  const canChange = access?.role === 'superadmin';

  if (customer) {
    return <InfoNote>This isn&apos;t available right now.</InfoNote>;
  }

  return (
    <InfoNote>
      {feature} is switched off. Turn it on in Settings &gt; Features to use this.
      {canChange ? (
        <>
          {' '}
          <Link href="/admin/settings" className="font-semibold text-[#FF7A19] underline">
            Settings
          </Link>
        </>
      ) : null}
    </InfoNote>
  );
}
