'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ErrorState } from '@/components/ui-states';
import { deviceRequest } from '@/lib/devicesAdmin';
import {
  clearPublicFeaturesCache,
  fetchPublicFeatures,
  type PublicFeatures,
} from '@/lib/features';

const FLAGS: Array<{
  key: keyof PublicFeatures;
  label: string;
  warning: string;
}> = [
  {
    key: 'feature_affiliates_enabled',
    label: 'Affiliate programme',
    warning: 'Turning this on starts taking real GHS 300 payments',
  },
  {
    key: 'feature_vlb_v3_enabled',
    label: 'Laptop Banking V3.0',
    warning: 'Turning this on lets staff activate investments and gives investors their dashboard.',
  },
];

export function FeaturesCard() {
  const [flags, setFlags] = useState<PublicFeatures | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<keyof PublicFeatures | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicFeatures()
      .then((data) => {
        if (!cancelled) {
          setFlags(data);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (key: keyof PublicFeatures, next: boolean) => {
    setBusy(key);
    try {
      const result = await deviceRequest<PublicFeatures>('/api/admin/features', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: next }),
      });
      clearPublicFeaturesCache();
      setFlags(result.data);
      toast.success('Feature switch saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this switch.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-[#1A1A1A]">Features</h2>
      <p className="mt-1 text-sm text-[#3A3A3A]">
        Finished features stay off in production until you switch them on.
      </p>
      {loadFailed && !flags ? (
        <div className="mt-4">
          <ErrorState
            title="We couldn't load feature switches"
            description="Refresh the page and try again."
            primary={{ label: 'Refresh', onClick: () => window.location.reload() }}
          />
        </div>
      ) : null}
      <div className="mt-4 space-y-3">
        {FLAGS.map((item) => {
          const on = flags?.[item.key] === true;
          const disabled = !flags || busy === item.key;
          return (
            <div key={item.key} className="min-w-0 rounded-lg border border-gray-200 p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A1A1A]">{item.label}</p>
                  <p className="mt-1 text-sm text-amber-800">{item.warning}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={item.label}
                  disabled={disabled}
                  onClick={() => void toggle(item.key, !on)}
                  className={`relative inline-flex h-11 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    on ? 'bg-[#FF7A19]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                      on ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
