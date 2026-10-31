'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminRowCard,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { useAccess } from '@/context/AccessContext';
import { formatGhs } from '@/lib/vlb';
import { AccessDenied, EmptyState, ErrorState } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import {
  apiMessage,
  deviceRequest,
  fetchAdminPublicDocs,
  openAdminVlbDocument,
  pesewasFromGhs,
  removePublicDocument,
  uploadPublicDocument,
  type VlbAdminPlan,
  type VlbPublicDocKind,
  type VlbPublicDocSlot,
  type VlbPublicDocsAdmin,
} from '@/lib/vlbAdmin';
import { formatDeviceDate } from '@/lib/devicesAdmin';

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
  const { canEdit } = useAccess();
  const editable = canEdit('vlb');
  const [rows, setRows] = useState<VlbAdminPlan[]>([]);
  const [open, setOpen] = useState<VlbAdminPlan | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [publicDocs, setPublicDocs] = useState<VlbPublicDocsAdmin>({ guide: null, agreement_template: null });
  const [publicFiles, setPublicFiles] = useState<Partial<Record<VlbPublicDocKind, File | null>>>({});

  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = () =>
    deviceRequest<VlbAdminPlan[]>('/api/admin/vlb/plans')
      .then((result) => {
        setRows(result.data || []);
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
      })
      .catch((error) => {
        const kind = noteQueryFail(error);
        if (kind === 'forbidden') setForbidden(true);
        else if (kind !== 'unauthorized') setFailed(true);
      });

  const loadPublicDocs = () =>
    fetchAdminPublicDocs()
      .then((result) => setPublicDocs(result.data || { guide: null, agreement_template: null }))
      .catch(() => setPublicDocs({ guide: null, agreement_template: null }));

  useEffect(() => {
    void load();
    void loadPublicDocs();
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
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Plans"
        subtitle={`${rows.length} plan${rows.length === 1 ? '' : 's'}`}
        primary={
          editable
            ? { label: 'Add plan', icon: <Plus size={16} />, onClick: () => { setOpen('new'); setForm(EMPTY); } }
            : undefined
        }
      />
      <VlbNav current="/admin/vlb/plans" />
      {forbidden ? (
        <AccessDenied title="You don't have access" description="You don't have access to this data." primary={{ label: 'Go back', href: '/admin' }} />
      ) : failed && !loaded ? (
        <ErrorState title="We couldn't load plans" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => void load() }} />
      ) : (
        <>
          <section className="rounded-xl bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="font-semibold text-[#1A1A1A]">Public documents</h2>
              <p className="mt-1 text-sm text-[#3A3A3A]">
                PDF files for the public Laptop Banking page. Learn More uses the guide; Read Agreement uses the template.
              </p>
            </div>
            <PublicDocSlot
              label="Laptop Banking guide (Learn More)"
              kind="guide"
              doc={publicDocs.guide}
              file={publicFiles.guide || null}
              editable={editable}
              busy={busy}
              onFile={(file) => setPublicFiles((current) => ({ ...current, guide: file }))}
              onSaved={async () => {
                setPublicFiles((current) => ({ ...current, guide: null }));
                await loadPublicDocs();
              }}
              onBusy={setBusy}
            />
            <PublicDocSlot
              label="Agreement template (Read Agreement)"
              kind="agreement_template"
              doc={publicDocs.agreement_template}
              file={publicFiles.agreement_template || null}
              editable={editable}
              busy={busy}
              onFile={(file) => setPublicFiles((current) => ({ ...current, agreement_template: file }))}
              onSaved={async () => {
                setPublicFiles((current) => ({ ...current, agreement_template: null }));
                await loadPublicDocs();
              }}
              onBusy={setBusy}
            />
          </section>
          {loaded && rows.length === 0 ? (
            <EmptyState title="No plans yet" description="Add a plan to offer Laptop Banking investments." />
          ) : rows.length === 0 ? null : (
            <ResponsiveTable
              headers={
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Principal</th>
                  <th className="px-4 py-3">Rates</th>
                  <th className="px-4 py-3">Stars</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              }
              cards={rows.map((row) => (
                <AdminRowCard
                  key={row.id}
                  name={row.name}
                  status={<Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>}
                  facts={[
                    { label: 'Group', value: `${row.plan_group} · ${row.version}` },
                    { label: 'Principal', value: formatGhs(row.principal_pesewas) },
                    { label: 'Rates', value: `${(row.term_rates_percent || []).join('% / ')}%` },
                    { label: 'Stars', value: row.premium_stars },
                  ]}
                  actions={
                    editable ? (
                      <RowActions
                        name={row.name}
                        actions={[{ label: 'Edit', onClick: () => startEdit(row) }]}
                      />
                    ) : undefined
                  }
                />
              ))}
            >
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {row.name}
                    <p className="text-xs text-[#3A3A3A]">{row.plan_group} · {row.version}</p>
                  </td>
                  <td className="px-4 py-3">{formatGhs(row.principal_pesewas)}</td>
                  <td className="px-4 py-3">{(row.term_rates_percent || []).join('% / ')}%</td>
                  <td className="px-4 py-3">{row.premium_stars}</td>
                  <td className="px-4 py-3"><Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {editable ? (
                      <RowActions
                        name={row.name}
                        actions={[{ label: 'Edit', onClick: () => startEdit(row) }]}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </ResponsiveTable>
          )}
        </>
      )}
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

function PublicDocSlot({
  label,
  kind,
  doc,
  file,
  editable,
  busy,
  onFile,
  onSaved,
  onBusy,
}: {
  label: string;
  kind: VlbPublicDocKind;
  doc: VlbPublicDocSlot | null;
  file: File | null;
  editable: boolean;
  busy: boolean;
  onFile: (file: File | null) => void;
  onSaved: () => Promise<void>;
  onBusy: (value: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="font-medium text-[#1A1A1A]">{label}</h3>
      {doc ? (
        <p className="text-sm text-[#1A1A1A]">
          Current:{' '}
          <button
            type="button"
            className="font-medium text-[#FF7A19]"
            onClick={() => openAdminVlbDocument(doc.id).catch((error) => toast.error(apiMessage(error, 'Could not download this file.')))}
          >
            {doc.title}
          </button>
          <span className="text-[#3A3A3A]"> · {formatDeviceDate(doc.created_at)}</span>
        </p>
      ) : (
        <p className="text-sm text-[#3A3A3A]">No file uploaded yet.</p>
      )}
      {editable && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!file) {
              toast.error('Choose a PDF.');
              return;
            }
            onBusy(true);
            try {
              await uploadPublicDocument(kind, file, file.name);
              toast.success(doc ? 'File replaced.' : 'File uploaded.');
              onFile(null);
              await onSaved();
            } catch (error) {
              toast.error(apiMessage(error, 'Could not store this file.'));
            } finally {
              onBusy(false);
            }
          }}
        >
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            type="file"
            accept="application/pdf"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
          <Button type="submit" disabled={busy}>{doc ? 'Replace' : 'Upload'}</Button>
          {doc ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                onBusy(true);
                try {
                  await removePublicDocument(kind);
                  toast.success('File removed.');
                  await onSaved();
                } catch (error) {
                  toast.error(apiMessage(error, 'Could not remove this file.'));
                } finally {
                  onBusy(false);
                }
              }}
            >
              Remove
            </Button>
          ) : null}
        </form>
      )}
    </div>
  );
}
