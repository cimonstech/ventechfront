'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatGhs } from '@/lib/vlb';
import { apiMessage, deviceRequest, openAdminVlbDocument, pesewasFromGhs, uploadAgreementTemplate, type VlbAdminPlan } from '@/lib/vlbAdmin';

const EMPTY = {
  plan_group: 'vts',
  tier: '',
  name: '',
  principal: '',
  version: 'V3.0',
  terms_count: '3',
  months_per_term: '3',
  settlement_months: '1',
  term_rates: '8, 8, 8',
  rate_basis: 'per_month',
  payout_frequency: 'monthly',
  scholar_fund_percent: '1',
  scholar_fund_basis: 'gross_payout',
  premium_stars: '5',
  referral_bonus_percent: '1',
  sort_order: '0',
};

function parseRates(value: string): number[] {
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((rate) => Number.isFinite(rate));
}

export default function AdminVlbPlansPage() {
  useSetAdminHeading('Plans');
  const { canEdit } = useAccess();
  const editable = canEdit('vlb');
  const [rows, setRows] = useState<VlbAdminPlan[]>([]);
  const [open, setOpen] = useState<VlbAdminPlan | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState<{ id: string; title: string; created_at: string; url: string | null } | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const load = () =>
    deviceRequest<VlbAdminPlan[]>('/api/admin/vlb/plans')
      .then((result) => setRows(result.data || []))
      .catch((error) => toast.error(apiMessage(error, 'Could not load plans')));

  const loadTemplate = () =>
    deviceRequest<{ id: string; title: string; created_at: string; url: string | null } | null>('/api/admin/vlb/agreement-template')
      .then((result) => setTemplate(result.data || null))
      .catch(() => setTemplate(null));

  useEffect(() => {
    void load();
    void loadTemplate();
  }, []);

  const startEdit = (plan: VlbAdminPlan) => {
    setOpen(plan);
    setForm({
      plan_group: plan.plan_group === 'exclusive' ? 'exclusive' : 'vts',
      tier: plan.tier,
      name: plan.name,
      principal: (Number(plan.principal_pesewas) / 100).toFixed(2),
      version: plan.version,
      terms_count: String(plan.terms_count),
      months_per_term: String(plan.months_per_term),
      settlement_months: String(plan.settlement_months),
      term_rates: (plan.term_rates_percent || []).join(', '),
      rate_basis: plan.rate_basis,
      payout_frequency: plan.payout_frequency,
      scholar_fund_percent: String(plan.scholar_fund_percent),
      scholar_fund_basis: plan.scholar_fund_basis,
      premium_stars: String(plan.premium_stars),
      referral_bonus_percent: String(plan.referral_bonus_percent),
      sort_order: String(plan.sort_order),
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const rates = parseRates(form.term_rates);
    if (rates.length === 0) {
      toast.error('Enter at least one term rate.');
      return;
    }
    setBusy(true);
    const body = {
      plan_group: form.plan_group,
      tier: form.tier,
      name: form.name,
      principal_pesewas: pesewasFromGhs(form.principal),
      version: form.version || undefined,
      terms_count: Number(form.terms_count),
      months_per_term: Number(form.months_per_term),
      settlement_months: Number(form.settlement_months),
      term_rates_percent: rates,
      rate_basis: form.rate_basis,
      payout_frequency: form.payout_frequency,
      scholar_fund_percent: Number(form.scholar_fund_percent),
      scholar_fund_basis: form.scholar_fund_basis,
      premium_stars: Number(form.premium_stars),
      referral_bonus_percent: Number(form.referral_bonus_percent),
      sort_order: Number(form.sort_order),
    };
    try {
      if (open === 'new') {
        await deviceRequest('/api/admin/vlb/plans', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Plan created.');
      } else if (open) {
        await deviceRequest(`/api/admin/vlb/plans/${open.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Plan saved.');
      }
      setOpen(null);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save this plan.'));
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof typeof EMPTY) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/plans" />
      <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-[#1A1A1A]">Agreement template</h2>
        <p className="text-sm text-[#3A3A3A]">
          Blank template shown on the public Laptop Banking page and in investor documents.
        </p>
        {template ? (
          <p className="text-sm text-[#1A1A1A]">
            Current:{' '}
            <button
              type="button"
              className="font-medium text-[#FF7A19]"
              onClick={() => openAdminVlbDocument(template.id).catch((error) => toast.error(apiMessage(error, 'Could not download this file.')))}
            >
              {template.title}
            </button>
          </p>
        ) : (
          <p className="text-sm text-[#3A3A3A]">No template uploaded yet.</p>
        )}
        {editable && (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!templateFile) {
                toast.error('Choose a PDF.');
                return;
              }
              setBusy(true);
              try {
                await uploadAgreementTemplate(templateFile, 'Laptop Banking agreement');
                toast.success(template ? 'Template replaced.' : 'Template uploaded.');
                setTemplateFile(null);
                await loadTemplate();
              } catch (error) {
                toast.error(apiMessage(error, 'Could not store this file.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              type="file"
              accept="application/pdf"
              onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
            />
            <Button type="submit" disabled={busy}>{template ? 'Replace template' : 'Upload template'}</Button>
          </form>
        )}
      </section>
      {editable && (
        <Button onClick={() => { setOpen('new'); setForm(EMPTY); }}>New plan</Button>
      )}
      <div className="overflow-x-auto sticky-first rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Principal</th>
              <th className="px-4 py-3 font-medium">Rates</th>
              <th className="px-4 py-3 font-medium">Stars</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">
                  {row.name}
                  <p className="text-xs text-[#3A3A3A]">{row.plan_group} · {row.version}</p>
                </td>
                <td className="px-4 py-3">{formatGhs(row.principal_pesewas)}</td>
                <td className="px-4 py-3">{(row.term_rates_percent || []).join('% / ')}%</td>
                <td className="px-4 py-3">{row.premium_stars}</td>
                <td className="px-4 py-3"><Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-4 py-3">
                  {editable && <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 space-y-3" onSubmit={save}>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">{open === 'new' ? 'New plan' : 'Edit plan'}</h2>
            {open !== 'new' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Changing money fields on a plan with investments creates a new version. Existing investments keep the old figures.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded-lg border px-3 py-2 text-sm" value={form.plan_group} onChange={set('plan_group')}>
                <option value="vts">VTS</option>
                <option value="exclusive">Exclusive</option>
              </select>
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Tier" value={form.tier} onChange={set('tier')} />
            </div>
            <input className="w-full rounded-lg border px-3 py-2 text-sm" required placeholder="Name" value={form.name} onChange={set('name')} />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Principal GHS" value={form.principal} onChange={set('principal')} />
              <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Version" value={form.version} onChange={set('version')} />
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Terms" value={form.terms_count} onChange={set('terms_count')} />
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Months per term" value={form.months_per_term} onChange={set('months_per_term')} />
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Settlement months" value={form.settlement_months} onChange={set('settlement_months')} />
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Sort order" value={form.sort_order} onChange={set('sort_order')} />
            </div>
            <label className="block text-sm">Term rates % (comma separated)
              <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required value={form.term_rates} onChange={set('term_rates')} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded-lg border px-3 py-2 text-sm" value={form.rate_basis} onChange={set('rate_basis')}>
                <option value="per_month">Per month</option>
                <option value="per_term">Per term</option>
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm" value={form.payout_frequency} onChange={set('payout_frequency')}>
                <option value="monthly">Monthly</option>
                <option value="end_of_term">End of term</option>
              </select>
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Scholar %" value={form.scholar_fund_percent} onChange={set('scholar_fund_percent')} />
              <select className="rounded-lg border px-3 py-2 text-sm" value={form.scholar_fund_basis} onChange={set('scholar_fund_basis')}>
                <option value="gross_payout">Of gross payout</option>
                <option value="principal">Of principal</option>
              </select>
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Premium stars" value={form.premium_stars} onChange={set('premium_stars')} />
              <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Referral %" value={form.referral_bonus_percent} onChange={set('referral_bonus_percent')} />
            </div>
            {open !== 'new' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={open.is_active}
                  onChange={async (event) => {
                    try {
                      await deviceRequest(`/api/admin/vlb/plans/${open.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ is_active: event.target.checked }),
                      });
                      setOpen({ ...open, is_active: event.target.checked });
                      await load();
                    } catch (error) {
                      toast.error(apiMessage(error, 'Could not update status.'));
                    }
                  }}
                />
                Active
              </label>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>Save</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
