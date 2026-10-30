'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { EMPTY_VLB_PAYOUT, payoutPayload, VlbPayoutFields, type VlbPayoutForm } from '@/components/admin/VlbPayoutFields';
import {
  apiMessage,
  deviceRequest,
  nested,
  pesewasFromGhs,
  uploadVlbDocument,
  type VlbAdminPlan,
  type VlbApplicationRow,
  type VlbSchedulePreview,
} from '@/lib/vlbAdmin';
import { formatDeviceDate } from '@/lib/devicesAdmin';

export default function AdminVlbApplicationDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  useSetAdminHeading('Application');
  const { canEdit, access } = useAccess();
  const editable = canEdit('vlb');
  const money = canEdit('vlb') && canEdit('finance');
  const superadmin = access?.role === 'superadmin';
  const [row, setRow] = useState<VlbApplicationRow | null>(null);
  const [plans, setPlans] = useState<VlbAdminPlan[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('contacted');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [reference, setReference] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [payoutForm, setPayoutForm] = useState<VlbPayoutForm>(EMPTY_VLB_PAYOUT);
  const [includePayout, setIncludePayout] = useState(false);
  const [preview, setPreview] = useState<VlbSchedulePreview | null>(null);

  const load = () =>
    deviceRequest<VlbApplicationRow>(`/api/admin/vlb/applications/${id}`).then((result) => {
      setRow(result.data);
      setNotes(result.data.notes || '');
      setEmail(result.data.email);
      setPlanId(result.data.plan_id || '');
      setStatus(result.data.status === 'activated' ? 'contacted' : result.data.status);
    });

  useEffect(() => {
    if (!id) return;
    load().catch((error) => toast.error(apiMessage(error, 'Could not load this application.')));
    deviceRequest<VlbAdminPlan[]>('/api/admin/vlb/plans')
      .then((result) => setPlans((result.data || []).filter((plan) => plan.is_active)))
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    const plan = plans.find((item) => item.id === planId);
    if (plan) setAmount((Number(plan.principal_pesewas) / 100).toFixed(2));
  }, [planId, plans]);

  useEffect(() => {
    if (!planId || !startDate) {
      setPreview(null);
      return;
    }
    const principal = pesewasFromGhs(amount);
    const params = new URLSearchParams({ plan_id: planId, start_date: startDate });
    if (principal > 0) params.set('principal_pesewas', String(principal));
    deviceRequest<VlbSchedulePreview>(`/api/admin/vlb/preview-schedule?${params}`)
      .then((result) => setPreview(result.data))
      .catch(() => setPreview(null));
  }, [planId, startDate, amount]);

  if (!row) return <p className="text-sm text-[#3A3A3A]">Loading application…</p>;

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb" />
      <Link href="/admin/vlb" className="text-sm font-medium text-[#FF7A19]">Back to applications</Link>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">{row.full_name}</h1>
            <p className="text-sm text-[#3A3A3A]">{row.email} · {row.phone}</p>
          </div>
          <Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>
        </div>
        <p className="mt-3 text-sm text-[#3A3A3A]">{nested(row.vlb_plans)?.name || 'No plan'} · {formatDeviceDate(row.created_at)}</p>
        {row.message && <p className="mt-3 text-sm text-[#1A1A1A]">{row.message}</p>}
      </div>

      {editable && row.status !== 'activated' && (
        <form
          className="rounded-xl bg-white p-6 shadow-sm space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await deviceRequest(`/api/admin/vlb/applications/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status, notes }),
              });
              toast.success('Application updated.');
              await load();
            } catch (error) {
              toast.error(apiMessage(error, 'Could not update this application.'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-semibold text-[#1A1A1A]">Notes and status</h2>
          <select className="w-full rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="declined">Declined</option>
          </select>
          <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button type="submit" disabled={busy}>Save</Button>
        </form>
      )}

      {money && row.status !== 'activated' && row.status !== 'declined' && (
        <form
          className="rounded-xl bg-white p-6 shadow-sm space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const result = await deviceRequest<{ investor_id: string; investment_id: string }>(`/api/admin/vlb/applications/${id}/activate`, {
                method: 'POST',
                body: JSON.stringify({
                  email,
                  plan_id: planId,
                  principal_pesewas: pesewasFromGhs(amount),
                  start_date: startDate,
                  payment_method: paymentMethod,
                  payment_reference: reference,
                  agreement_signed_at: agreementDate,
                  payout: includePayout ? payoutPayload(payoutForm) : undefined,
                }),
              });
              if (agreementFile && result.data?.investor_id && result.data?.investment_id) {
                try {
                  await uploadVlbDocument(
                    result.data.investor_id,
                    agreementFile,
                    'agreement',
                    'Signed agreement',
                    result.data.investment_id
                  );
                } catch (uploadError) {
                  toast.error(apiMessage(uploadError, 'Investment activated, but the agreement file could not be stored.'));
                }
              }
              toast.success('Investment activated.');
              await load();
            } catch (error) {
              toast.error(apiMessage(error, 'Could not activate this investment.'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-semibold text-[#1A1A1A]">Activate</h2>
          <label className="block text-sm">Email
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">Plan
            <select className="mt-1 w-full rounded-lg border px-3 py-2" required value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name} ({plan.version})</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">Amount (GHS)
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={!superadmin}
            />
          </label>
          <p className="text-xs text-[#3A3A3A]">{superadmin ? 'Principal must match the plan. You can override it.' : 'Principal must match the plan.'}</p>
          <label className="block text-sm">Start date
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="block text-sm">Payment method
            <input className="mt-1 w-full rounded-lg border px-3 py-2" required value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          </label>
          <label className="block text-sm">Payment reference
            <input className="mt-1 w-full rounded-lg border px-3 py-2" required value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <label className="block text-sm">Agreement signed
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" required value={agreementDate} onChange={(e) => setAgreementDate(e.target.value)} />
          </label>
          <label className="block text-sm">Signed agreement (PDF)
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              type="file"
              accept="application/pdf"
              onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
            />
          </label>
          <p className="text-xs text-[#3A3A3A]">Optional. Activation still works without the file; the investment will show Agreement missing until one is uploaded.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includePayout} onChange={(e) => setIncludePayout(e.target.checked)} />
            Record payout details now
          </label>
          {includePayout && <VlbPayoutFields value={payoutForm} onChange={setPayoutForm} />}
          {preview && (
            <div className="overflow-x-auto sticky-first rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-medium text-[#1A1A1A]">Schedule preview</p>
              <p className="text-xs text-[#3A3A3A]">
                Total net {formatGhs(preview.totals.total_net)} · Scholar {formatGhs(preview.totals.scholar_fund_total)}
              </p>
              <table className="mt-2 min-w-[28rem] w-full text-left text-xs">
                <thead>
                  <tr className="text-[#3A3A3A]">
                    <th className="py-1">Due</th>
                    <th className="py-1">Type</th>
                    <th className="py-1">Gross</th>
                    <th className="py-1">Scholar</th>
                    <th className="py-1">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.schedule.map((item) => (
                    <tr key={`${item.type}-${item.period_no}`} className="border-t">
                      <td className="py-1">{formatDeviceDate(item.due_date)}</td>
                      <td className="py-1">{item.type} {item.period_no}</td>
                      <td className="py-1">{formatGhs(item.gross_pesewas)}</td>
                      <td className="py-1">{formatGhs(item.scholar_pesewas)}</td>
                      <td className="py-1">{formatGhs(item.net_pesewas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button type="submit" disabled={busy || !preview}>Activate</Button>
        </form>
      )}
    </div>
  );
}
