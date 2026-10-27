'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { AffiliatesNav } from '@/components/admin/AffiliatesNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import {
  AffiliateSettings,
  apiMessage,
  deviceRequest,
  ghsInput,
  pesewasFromGhs,
} from '@/lib/affiliatesAdmin';

const EMPTY: AffiliateSettings = {
  affiliate_fee_pesewas: 0,
  affiliate_commission_pesewas: 0,
  affiliate_activation_mode: 'approval',
  affiliate_fee_refund_on_rejection: true,
  affiliate_eligible_category_slugs: [],
  affiliate_min_order_pesewas: 0,
  affiliate_attribution_days: 30,
  affiliate_return_window_days: 7,
  affiliate_withdrawal_min_pesewas: 0,
  affiliate_payout_change_hold_hours: 48,
};

export default function AdminAffiliateSettingsPage() {
  useSetAdminHeading('Affiliate settings');
  const { canEdit } = useAccess();
  const finance = canEdit('finance');
  const [form, setForm] = useState(EMPTY);
  const [fee, setFee] = useState('0.00');
  const [commission, setCommission] = useState('0.00');
  const [minOrder, setMinOrder] = useState('0.00');
  const [minWithdraw, setMinWithdraw] = useState('0.00');
  const [slugs, setSlugs] = useState('laptops');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!finance) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    deviceRequest<AffiliateSettings>('/api/admin/affiliates/settings')
      .then((result) => {
        if (cancelled) return;
        const data = result.data;
        setForm(data);
        setFee(ghsInput(data.affiliate_fee_pesewas));
        setCommission(ghsInput(data.affiliate_commission_pesewas));
        setMinOrder(ghsInput(data.affiliate_min_order_pesewas));
        setMinWithdraw(ghsInput(data.affiliate_withdrawal_min_pesewas));
        setSlugs((data.affiliate_eligible_category_slugs || []).join(', '));
      })
      .catch((error) => {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load settings'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [finance]);

  if (!finance) {
    return (
      <div className="space-y-4">
        <AffiliatesNav current="/admin/affiliates/settings" />
        <p className="text-sm text-[#3A3A3A]">Finance access is required to change affiliate settings.</p>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const result = await deviceRequest<AffiliateSettings>('/api/admin/affiliates/settings', {
        method: 'PUT',
        body: JSON.stringify({
          affiliate_fee_pesewas: pesewasFromGhs(fee),
          affiliate_commission_pesewas: pesewasFromGhs(commission),
          affiliate_activation_mode: form.affiliate_activation_mode,
          affiliate_fee_refund_on_rejection: form.affiliate_fee_refund_on_rejection,
          affiliate_eligible_category_slugs: slugs.split(',').map((item) => item.trim()).filter(Boolean),
          affiliate_min_order_pesewas: pesewasFromGhs(minOrder),
          affiliate_attribution_days: Number(form.affiliate_attribution_days),
          affiliate_return_window_days: Number(form.affiliate_return_window_days),
          affiliate_withdrawal_min_pesewas: pesewasFromGhs(minWithdraw),
          affiliate_payout_change_hold_hours: Number(form.affiliate_payout_change_hold_hours),
        }),
      });
      toast.success(result.message);
      if (result.data) setForm(result.data);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <AffiliatesNav current="/admin/affiliates/settings" />
      <p className="text-sm text-[#3A3A3A] bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
        Changes affect new commissions only. Existing pending and approved commissions stay as they are.
      </p>

      {loading ? (
        <p className="text-sm text-[#3A3A3A]">Loading settings…</p>
      ) : (
        <form
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Application fee (GHS)</span>
            <input type="number" min="0" step="0.01" value={fee} onChange={(event) => setFee(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Commission per sale (GHS)</span>
            <input type="number" min="0" step="0.01" value={commission} onChange={(event) => setCommission(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">How applications become active</span>
            <select
              value={form.affiliate_activation_mode}
              onChange={(event) => setForm((current) => ({ ...current, affiliate_activation_mode: event.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="approval">Manual approval</option>
              <option value="automatic">Automatic after fee payment</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={form.affiliate_fee_refund_on_rejection}
              onChange={(event) => setForm((current) => ({ ...current, affiliate_fee_refund_on_rejection: event.target.checked }))}
            />
            Refund the application fee when an application is rejected
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Eligible category slugs</span>
            <input value={slugs} onChange={(event) => setSlugs(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="laptops, printers" />
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Minimum order (GHS)</span>
            <input type="number" min="0" step="0.01" value={minOrder} onChange={(event) => setMinOrder(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Click attribution (days)</span>
            <input
              type="number"
              min="1"
              value={form.affiliate_attribution_days}
              onChange={(event) => setForm((current) => ({ ...current, affiliate_attribution_days: Number(event.target.value) }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Return window after delivery (days)</span>
            <input
              type="number"
              min="0"
              value={form.affiliate_return_window_days}
              onChange={(event) => setForm((current) => ({ ...current, affiliate_return_window_days: Number(event.target.value) }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Minimum withdrawal (GHS)</span>
            <input type="number" min="0" step="0.01" value={minWithdraw} onChange={(event) => setMinWithdraw(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="text-[#3A3A3A]">Hold after payout details change (hours)</span>
            <input
              type="number"
              min="0"
              value={form.affiliate_payout_change_hold_hours}
              onChange={(event) => setForm((current) => ({ ...current, affiliate_payout_change_hold_hours: Number(event.target.value) }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <Button type="submit" isLoading={saving} disabled={saving}>Save settings</Button>
        </form>
      )}
    </div>
  );
}
