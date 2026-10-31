'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { AdminQueryFail } from '@/components/admin/AdminQueryFail';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { VlbScheduleView } from '@/components/vlb/VlbScheduleView';
import { FieldError } from '@/components/ui-states';
import { ConfirmDialog } from '@/components/admin/list';
import { AgreementFilePicker } from '@/components/vlb/AgreementFilePicker';
import { useAccess } from '@/context/AccessContext';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { EMPTY_VLB_PAYOUT, payoutPayload, VlbPayoutFields, type VlbPayoutForm } from '@/components/admin/VlbPayoutFields';
import {
  apiMessage,
  deviceRequest,
  nested,
  openApplicationAgreementFile,
  pesewasFromGhs,
  removeApplicationAgreement,
  sendApplicationUploadLink,
  uploadApplicationAgreement,
  type VlbAdminPlan,
  type VlbApplicationRow,
  type VlbSchedulePreview,
} from '@/lib/vlbAdmin';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { applyQueryFail } from '@/lib/queryState';

export default function AdminVlbApplicationDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  useSetAdminHeading('Application');
  const { canEdit, canMoveVlbMoney, access } = useAccess();
  const editable = canEdit('vlb');
  const money = canMoveVlbMoney;
  const superadmin = access?.role === 'superadmin';
  const [row, setRow] = useState<VlbApplicationRow | null>(null);
  const [plans, setPlans] = useState<VlbAdminPlan[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('contacted');
  const [busy, setBusy] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [featureOff, setFeatureOff] = useState(false);
  const [email, setEmail] = useState('');
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [reference, setReference] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [behalfFiles, setBehalfFiles] = useState<File[]>([]);
  const [linkMessage, setLinkMessage] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState('');
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
      setFailed(false);
      setForbidden(false);
      setFeatureOff(false);
    });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    load().catch((error) => {
      if (!cancelled) applyQueryFail(error, { setFeatureOff, setForbidden, setFailed });
    });
    deviceRequest<VlbAdminPlan[]>('/api/admin/vlb/plans')
      .then((result) => {
        if (!cancelled) setPlans((result.data || []).filter((plan) => plan.is_active));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
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

  if (featureOff || forbidden || (failed && !row)) {
    return (
      <div className="space-y-6">
        <VlbNav current="/admin/vlb" />
        <AdminQueryFail
          featureOff={featureOff}
          forbidden={forbidden}
          failed={failed}
          loaded={Boolean(row)}
          feature="Laptop Banking"
          onRetry={() => void load().catch((error) => applyQueryFail(error, { setFeatureOff, setForbidden, setFailed }))}
          errorTitle="We couldn't load this application"
        />
      </div>
    );
  }

  if (!row) return <p className="text-sm text-[#3A3A3A]">Loading application…</p>;

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <VlbNav current="/admin/vlb" />
      <Link href="/admin/vlb" className="text-sm font-medium text-[#FF7A19]">Back to applications</Link>
      <div className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm sm:p-6">
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
          className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm space-y-3 sm:p-6"
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
          <Button type="submit" disabled={busy}>{busy ? 'Working...' : 'Save'}</Button>
        </form>
      )}

      <section className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm space-y-3 sm:p-6">
        <h2 className="font-semibold text-[#1A1A1A]">Signed agreement</h2>
        <p className="text-sm text-[#3A3A3A]">{row.agreement_status || (row.agreement_uploaded ? 'Uploaded' : 'Not uploaded yet')}</p>
        {(row.agreement_files || []).length > 0 ? (
          <ul className="space-y-2">
            {(row.agreement_files || []).map((file) => (
              <li key={file.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3">
                <button
                  type="button"
                  className="min-w-0 truncate text-left font-medium text-[#FF7A19]"
                  onClick={() => openApplicationAgreementFile(id, file.id).catch((error) => {
                    load().then(() => openApplicationAgreementFile(id, file.id)).catch(() => toast.error(apiMessage(error, 'Could not open this file.')));
                  })}
                >
                  {file.file_name}
                </button>
                {editable && row.status !== 'activated' ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setRemoveId(file.id); setRemoveReason(''); }}>
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {editable && row.status !== 'activated' && row.status !== 'declined' ? (
          <>
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!behalfFiles.length) return;
                setBusy(true);
                try {
                  await uploadApplicationAgreement(id, behalfFiles);
                  toast.success('Signed agreement saved.');
                  setBehalfFiles([]);
                  await load();
                } catch (error) {
                  toast.error(apiMessage(error, 'Could not store this file.'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p className="text-sm font-medium text-[#1A1A1A]">Upload on their behalf</p>
              <AgreementFilePicker files={behalfFiles} onFiles={setBehalfFiles} disabled={busy} />
              <Button type="submit" disabled={busy || !behalfFiles.length}>{busy ? 'Working...' : 'Upload'}</Button>
            </form>
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                try {
                  await sendApplicationUploadLink(id, linkMessage);
                  toast.success('Upload link sent.');
                  setLinkMessage('');
                } catch (error) {
                  toast.error(apiMessage(error, 'Could not send this upload link.'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p className="text-sm font-medium text-[#1A1A1A]">Send upload link</p>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm"
                rows={3}
                placeholder="Optional message, e.g. Page 3 wasn't signed."
                value={linkMessage}
                onChange={(e) => setLinkMessage(e.target.value)}
              />
              <Button type="submit" disabled={busy}>{busy ? 'Working...' : 'Send upload link'}</Button>
            </form>
          </>
        ) : null}
      </section>

      {money && row.status !== 'activated' && row.status !== 'declined' && (
        <form
          className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm space-y-3 sm:p-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setActivateError(null);
            try {
              await deviceRequest<{ investor_id: string; investment_id: string }>(`/api/admin/vlb/applications/${id}/activate`, {
                method: 'POST',
                body: JSON.stringify({
                  email,
                  plan_id: planId,
                  principal_pesewas: pesewasFromGhs(amount),
                  start_date: startDate,
                  payment_method: paymentMethod,
                  payment_reference: reference,
                  agreement_signed_at: agreementDate,
                  agreement_checked: agreementChecked,
                  payout: includePayout ? payoutPayload(payoutForm) : undefined,
                }),
              });
              toast.success('Investment activated.');
              await load();
            } catch (error) {
              setActivateError(apiMessage(error, 'Could not activate this investment.'));
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
          <label className="block text-sm">Date signed
            <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" required value={agreementDate} onChange={(e) => setAgreementDate(e.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
            />
            <span>I have checked the signed agreement is complete and signed</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includePayout} onChange={(e) => setIncludePayout(e.target.checked)} />
            Record payout details now
          </label>
          {includePayout && <VlbPayoutFields value={payoutForm} onChange={setPayoutForm} />}
          {preview && (
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-medium text-[#1A1A1A]">Schedule preview</p>
              <p className="text-xs text-[#3A3A3A]">
                Total net {formatGhs(preview.totals.total_net)} · Scholar {formatGhs(preview.totals.scholar_fund_total)}
              </p>
              <VlbScheduleView rows={preview.schedule} />
            </div>
          )}
          <Button type="submit" className="w-full sm:w-auto" disabled={busy || !preview || !row.agreement_uploaded || !agreementChecked}>
            {busy ? 'Working...' : row.agreement_uploaded ? 'Activate' : 'Upload the signed agreement first'}
          </Button>
          <FieldError message={activateError} />
        </form>
      )}
      {removeId ? (
        <ConfirmDialog
          title="Remove this file?"
          confirmLabel={busy ? 'Working...' : 'Remove'}
          busy={busy}
          onClose={() => setRemoveId(null)}
          onConfirm={async () => {
            if (!removeReason.trim()) {
              toast.error('Say why this file is being removed.');
              return;
            }
            setBusy(true);
            try {
              await removeApplicationAgreement(id, removeId, removeReason.trim());
              toast.success('File removed.');
              setRemoveId(null);
              await load();
            } catch (error) {
              toast.error(apiMessage(error, 'Could not remove this file.'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Reason
            <textarea
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
            />
          </label>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
