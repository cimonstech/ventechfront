'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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
    warning: 'Turning this on publishes Laptop Banking V3.0 terms and returns',
  },
];

export function FeaturesCard() {
  const [flags, setFlags] = useState<PublicFeatures | null>(null);
  const [busy, setBusy] = useState<keyof PublicFeatures | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicFeatures()
      .then((data) => {
        if (!cancelled) setFlags(data);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load feature switches.');
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
    <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Features</h2>
      <p className="mt-1 text-sm text-gray-600">
        Finished features stay off in production until you switch them on.
      </p>
      <div className="mt-4 space-y-4">
        {FLAGS.map((item) => {
          const on = flags?.[item.key] === true;
          const disabled = !flags || busy === item.key;
          return (
            <div key={item.key} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <p className="mt-1 text-sm text-amber-800">{item.warning}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={item.label}
                  disabled={disabled}
                  onClick={() => void toggle(item.key, !on)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
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
