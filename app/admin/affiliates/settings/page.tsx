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
  formatGhs,
  ghsInput,
  pesewasFromGhs,
} from '@/lib/affiliatesAdmin';
import { getCategories } from '@/services/category.service';
import type { Category } from '@/types/product';
import { AccessDenied, ErrorState, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';

const EMPTY: AffiliateSettings = {
  affiliate_fee_pesewas: 0,
  affiliate_commission_pesewas: 0,
  affiliate_activation_mode: 'approval',
  affiliate_fee_refund_on_rejection: true,
  affiliate_eligible_scope: 'all',
  affiliate_eligible_category_slugs: [],
  affiliate_commission_mode: 'flat',
  affiliate_commission_percent_bp: 0,
  affiliate_commission_cap_pesewas: null,
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
  const [percent, setPercent] = useState('0');
  const [cap, setCap] = useState('');
  const query = useListQuery();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () =>
    query.run(async () => {
      const [result, cats] = await Promise.all([
        deviceRequest<AffiliateSettings>('/api/admin/affiliates/settings'),
        getCategories(),
      ]);
      const data = result.data;
      setForm({ ...EMPTY, ...data });
      setFee(ghsInput(data.affiliate_fee_pesewas));
      setCommission(ghsInput(data.affiliate_commission_pesewas));
      setMinOrder(ghsInput(data.affiliate_min_order_pesewas));
      setMinWithdraw(ghsInput(data.affiliate_withdrawal_min_pesewas));
      setPercent(String((data.affiliate_commission_percent_bp || 0) / 100));
      setCap(
        data.affiliate_commission_cap_pesewas ? ghsInput(data.affiliate_commission_cap_pesewas) : ''
      );
      setCategories(cats);
    });

  useEffect(() => {
    if (!finance) return;
    void load();
  }, [finance]);

  if (!finance || query.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin/affiliates' }}
      />
    );
  }

  if (query.error && !query.loaded) {
    return (
      <ErrorState
        title="We couldn't load affiliate settings"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <TableSkeleton />;
  }

  const toggleSlug = (slug: string) => {
    const value = slug.toLowerCase();
    setForm((current) => {
      const present = current.affiliate_eligible_category_slugs.includes(value);
      return {
        ...current,
        affiliate_eligible_category_slugs: present
          ? current.affiliate_eligible_category_slugs.filter((item) => item !== value)
          : [...current.affiliate_eligible_category_slugs, value],
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const percentBp = Math.round(Number.parseFloat(percent || '0') * 100);
      const capPesewas = cap.trim() ? pesewasFromGhs(cap) : null;
      const result = await deviceRequest<AffiliateSettings>('/api/admin/affiliates/settings', {
        method: 'PUT',
        body: JSON.stringify({
          affiliate_fee_pesewas: pesewasFromGhs(fee),
          affiliate_commission_pesewas: pesewasFromGhs(commission),
          affiliate_activation_mode: form.affiliate_activation_mode,
          affiliate_fee_refund_on_rejection: form.affiliate_fee_refund_on_rejection,
          affiliate_eligible_scope: form.affiliate_eligible_scope || 'all',
          affiliate_eligible_category_slugs: form.affiliate_eligible_category_slugs,
          affiliate_commission_mode: form.affiliate_commission_mode || 'flat',
          affiliate_commission_percent_bp: Number.isFinite(percentBp) ? percentBp : 0,
          affiliate_commission_cap_pesewas: capPesewas && capPesewas > 0 ? capPesewas : null,
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

      {query.updating ? <UpdatingNotice /> : null}
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
          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
            <legend className="px-1 text-sm font-semibold text-[#1A1A1A]">Which sales earn commission</legend>
            <label className="flex min-h-11 items-start gap-2 text-sm text-[#1A1A1A]">
              <input
                type="radio"
                name="eligible-scope"
                checked={(form.affiliate_eligible_scope || 'all') === 'all'}
                onChange={() => setForm((current) => ({ ...current, affiliate_eligible_scope: 'all' }))}
                className="mt-1"
              />
              <span>All products (recommended)</span>
            </label>
            <label className="flex min-h-11 items-start gap-2 text-sm text-[#1A1A1A]">
              <input
                type="radio"
                name="eligible-scope"
                checked={form.affiliate_eligible_scope === 'categories'}
                onChange={() => setForm((current) => ({ ...current, affiliate_eligible_scope: 'categories' }))}
                className="mt-1"
              />
              <span>Only these categories</span>
            </label>
            {form.affiliate_eligible_scope === 'categories' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex min-h-11 items-center gap-2 text-sm text-[#3A3A3A]">
                    <input
                      type="checkbox"
                      checked={form.affiliate_eligible_category_slugs.includes(category.slug)}
                      onChange={() => toggleSlug(category.slug)}
                    />
                    {category.name}
                  </label>
                ))}
                {categories.length === 0 ? (
                  <p className="text-sm text-[#3A3A3A]">No categories yet. Add categories first, then choose them here.</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-[#1A1A1A]">Commission type</p>
              <label className="flex min-h-11 items-start gap-2 text-sm text-[#1A1A1A]">
                <input
                  type="radio"
                  name="commission-mode"
                  checked={(form.affiliate_commission_mode || 'flat') === 'flat'}
                  onChange={() => setForm((current) => ({ ...current, affiliate_commission_mode: 'flat' }))}
                  className="mt-1"
                />
                <span>Fixed amount per order</span>
              </label>
              {(form.affiliate_commission_mode || 'flat') === 'flat' ? (
                <label className="block text-sm">
                  <span className="text-[#3A3A3A]">Amount (GHS)</span>
                  <input type="number" min="0" step="0.01" value={commission} onChange={(event) => setCommission(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </label>
              ) : null}
              <label className="flex min-h-11 items-start gap-2 text-sm text-[#1A1A1A]">
                <input
                  type="radio"
                  name="commission-mode"
                  checked={form.affiliate_commission_mode === 'percent'}
                  onChange={() => setForm((current) => ({ ...current, affiliate_commission_mode: 'percent' }))}
                  className="mt-1"
                />
                <span>Percentage of the order</span>
              </label>
              {form.affiliate_commission_mode === 'percent' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-[#3A3A3A]">Percent</span>
                    <input type="number" min="0" max="50" step="0.01" value={percent} onChange={(event) => setPercent(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-[#3A3A3A]">Optional cap (GHS)</span>
                    <input type="number" min="0" step="0.01" value={cap} onChange={(event) => setCap(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="No cap" />
                  </label>
                </div>
              ) : null}
            </div>

            <label className="block text-sm">
              <span className="text-[#3A3A3A]">Minimum order value (GHS)</span>
              <input type="number" min="0" step="0.01" value={minOrder} onChange={(event) => setMinOrder(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
              <span className="mt-1 block text-xs text-[#3A3A3A]">
                Orders below this value don&apos;t earn commission. With a fixed amount per order, set this above the commission so small orders don&apos;t cost you money.
              </span>
            </label>
            {(form.affiliate_commission_mode || 'flat') === 'flat' && pesewasFromGhs(minOrder) < pesewasFromGhs(commission) ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                A {formatGhs(pesewasFromGhs(minOrder) > 0 ? pesewasFromGhs(minOrder) : 8000)} order would earn {formatGhs(pesewasFromGhs(commission))} commission. Set a minimum order value.
              </p>
            ) : null}
          </fieldset>
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
    </div>
  );
}
