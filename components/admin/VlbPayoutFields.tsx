'use client';

import { VLB_MOMO_NETWORKS } from '@/lib/vlbAdmin';

export type VlbPayoutForm = {
  payout_method: 'momo' | 'bank';
  momo_network: string;
  momo_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
};

export const EMPTY_VLB_PAYOUT: VlbPayoutForm = {
  payout_method: 'momo',
  momo_network: 'MTN',
  momo_number: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
};

export function payoutPayload(form: VlbPayoutForm) {
  return form.payout_method === 'momo'
    ? {
        payout_method: 'momo' as const,
        momo_network: form.momo_network,
        momo_number: form.momo_number.trim(),
      }
    : {
        payout_method: 'bank' as const,
        bank_name: form.bank_name.trim(),
        bank_account_name: form.bank_account_name.trim(),
        bank_account_number: form.bank_account_number.trim(),
      };
}

export function VlbPayoutFields({
  value,
  onChange,
}: {
  value: VlbPayoutForm;
  onChange: (next: VlbPayoutForm) => void;
}) {
  const set = (patch: Partial<VlbPayoutForm>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <label className="block text-sm">Payout method
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={value.payout_method}
          onChange={(e) => set({ payout_method: e.target.value as 'momo' | 'bank' })}
        >
          <option value="momo">MoMo</option>
          <option value="bank">Bank</option>
        </select>
      </label>
      {value.payout_method === 'momo' ? (
        <>
          <label className="block text-sm">MoMo network
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={value.momo_network}
              onChange={(e) => set({ momo_network: e.target.value })}
            >
              {VLB_MOMO_NETWORKS.map((network) => (
                <option key={network} value={network}>{network}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">MoMo number
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              required
              value={value.momo_number}
              onChange={(e) => set({ momo_number: e.target.value })}
            />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm">Bank name
            <input className="mt-1 w-full rounded-lg border px-3 py-2" required value={value.bank_name} onChange={(e) => set({ bank_name: e.target.value })} />
          </label>
          <label className="block text-sm">Account name
            <input className="mt-1 w-full rounded-lg border px-3 py-2" required value={value.bank_account_name} onChange={(e) => set({ bank_account_name: e.target.value })} />
          </label>
          <label className="block text-sm">Account number
            <input className="mt-1 w-full rounded-lg border px-3 py-2" required value={value.bank_account_number} onChange={(e) => set({ bank_account_number: e.target.value })} />
          </label>
        </>
      )}
    </div>
  );
}
