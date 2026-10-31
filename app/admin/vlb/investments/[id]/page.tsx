'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { downloadAuthFile, formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { apiMessage, deviceRequest } from '@/lib/vlbAdmin';
import { AdminQueryFail } from '@/components/admin/AdminQueryFail';
import { VlbScheduleView } from '@/components/vlb/VlbScheduleView';
import { FieldError } from '@/components/ui-states';
import { applyQueryFail } from '@/lib/queryState';

interface Detail {
  id: string;
  investor_id: string;
  investor_no: string | null;
  plan_name: string;
  principal_pesewas: number;
  start_date: string;
  maturity_date: string;
  status: string;
  renewal_choice: string;
  current_term: number;
  stars_total: number;
  stars_used: number;
  agreement_missing?: boolean;
  schedule: Array<{
    id: string;
    type: string;
    period_no: number;
    due_date: string;
    gross_pesewas: number;
    scholar_pesewas: number;
    net_pesewas: number;
    status: string;
    paid_at: string | null;
    reference: string | null;
  }>;
  star_redemptions: Array<{ id: string; product_note: string; created_at: string }>;
  referral_bonuses: Array<{ id: string; bonus_percent: number; applied_from_period: number }>;
}

interface InvestmentListRow {
  id: string;
  investor_no: string | null;
  plan_name: string;
  status: string;
}

export default function AdminVlbInvestmentDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  useSetAdminHeading('Investment');
  const { canEdit, canMoveVlbMoney } = useAccess();
  const editable = canEdit('vlb');
  const money = canMoveVlbMoney;
  const [row, setRow] = useState<Detail | null>(null);
  const [others, setOthers] = useState<InvestmentListRow[]>([]);
  const [note, setNote] = useState('');
  const [orderId, setOrderId] = useState('');
  const [referred, setReferred] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [featureOff, setFeatureOff] = useState(false);

  const load = () =>
    deviceRequest<Detail>(`/api/admin/vlb/investments/${id}`).then((result) => {
      setRow(result.data);
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
    deviceRequest<InvestmentListRow[]>('/api/admin/vlb/investments?limit=100')
      .then((result) => {
        if (!cancelled) setOthers((result.data || []).filter((item) => item.id !== id));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (featureOff || forbidden || (failed && !row)) {
    return (
      <div className="space-y-6">
        <VlbNav current="/admin/vlb/investments" />
        <AdminQueryFail
          featureOff={featureOff}
          forbidden={forbidden}
          failed={failed}
          loaded={Boolean(row)}
          feature="Laptop Banking"
          onRetry={() => void load().catch((error) => applyQueryFail(error, { setFeatureOff, setForbidden, setFailed }))}
          errorTitle="We couldn't load this investment"
        />
      </div>
    );
  }

  if (!row) return <p className="text-sm text-[#3A3A3A]">Loading investment…</p>;

  const run = async (path: string, body?: unknown, ok = 'Saved.') => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await deviceRequest(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      toast.success(ok);
      await load();
    } catch (error) {
      setActionError(apiMessage(error, 'Could not save this change.'));
    } finally {
      setBusy(false);
    }
  };

  const addStar = async (event: FormEvent) => {
    event.preventDefault();
    await run(`/api/admin/vlb/investments/${id}/stars`, {
      product_note: note,
      order_id: /^[0-9a-f-]{36}$/i.test(orderId.trim()) ? orderId.trim() : undefined,
    }, 'Star recorded.');
    setNote('');
    setOrderId('');
  };

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <VlbNav current="/admin/vlb/investments" />
      <Link href="/admin/vlb/investments" className="text-sm font-medium text-[#FF7A19]">Back to investments</Link>
      <div className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">{row.plan_name}</h1>
            <p className="text-sm text-[#3A3A3A]">
              {row.investor_no} · {formatGhs(row.principal_pesewas)} · term {row.current_term}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {row.agreement_missing ? <Badge variant="error">Agreement missing</Badge> : null}
            <Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>
          </div>
        </div>
        <p className="mt-2 text-sm text-[#3A3A3A]">
          {formatDeviceDate(row.start_date)} ? {formatDeviceDate(row.maturity_date)} · renewal {row.renewal_choice}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadAuthFile(
              `/api/admin/vlb/investments/${id}/confirmation.pdf`,
              `vlb-confirmation-${row.investor_no || id}.pdf`
            ).catch((error) => toast.error(apiMessage(error, 'Could not download this confirmation.')))}
          >
            Confirmation PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadAuthFile(
              `/api/admin/vlb/investments/${id}/statement.pdf`,
              `vlb-statement-${row.investor_no || id}.pdf`
            ).catch((error) => toast.error(apiMessage(error, 'Could not download this statement.')))}
          >
            Statement PDF
          </Button>
        </div>
        {row.status === 'settlement' && money && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => run(`/api/admin/vlb/investments/${id}/settle`, undefined, 'Settled.')}>{busy ? 'Working...' : 'Settle'}</Button>
            <Button variant="outline" disabled={busy} onClick={() => run(`/api/admin/vlb/investments/${id}/renew`, undefined, 'Renewed.')}>{busy ? 'Working...' : 'Renew'}</Button>
            <FieldError message={actionError} />
          </div>
        )}
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-semibold text-[#1A1A1A]">Schedule</h2>
        <VlbScheduleView
          rows={row.schedule}
          extra={(payout) => (
            <span className="text-sm">
              <Badge size="sm" variant={payoutStatusVariant((payout as Detail['schedule'][number]).status)}>{(payout as Detail['schedule'][number]).status}</Badge>
              {(payout as Detail['schedule'][number]).reference ? ` · ${(payout as Detail['schedule'][number]).reference}` : ''}
              {(payout as Detail['schedule'][number]).status === 'paid' ? (
                <button
                  type="button"
                  className="ml-2 text-[#FF7A19]"
                  onClick={() => downloadAuthFile(
                    `/api/admin/vlb/payouts/${payout.id}/receipt.pdf`,
                    `vlb-receipt-${payout.id}.pdf`
                  ).catch((error) => toast.error(apiMessage(error, 'Could not download this receipt.')))}
                >
                  Receipt
                </button>
              ) : null}
            </span>
          )}
        />
      </section>

      {editable && (
        <section className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm space-y-3 sm:p-6">
          <h2 className="font-semibold text-[#1A1A1A]">Premium Stars ({row.stars_used}/{row.stars_total})</h2>
          <ul className="text-sm text-[#3A3A3A]">
            {row.star_redemptions.map((item) => (
              <li key={item.id}>{item.product_note} · {formatDeviceDate(item.created_at)}</li>
            ))}
          </ul>
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={addStar}>
            <input className="rounded-lg border px-3 py-2 text-sm" required placeholder="Product note" value={note} onChange={(e) => setNote(e.target.value)} />
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Order id (optional)" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
            <Button type="submit" disabled={busy}>Record redemption</Button>
          </form>
        </section>
      )}

      {money && (
        <section className="min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm space-y-3 sm:p-6">
          <h2 className="font-semibold text-[#1A1A1A]">Referral bonus</h2>
          <p className="text-sm text-[#3A3A3A]">Applied: {row.referral_bonuses.length}</p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (!referred) return;
              void run(`/api/admin/vlb/investments/${id}/referral-bonus`, { referred_investment_id: referred }, 'Bonus applied.');
            }}
          >
            <select className="min-h-11 w-full min-w-0 max-w-full flex-1 rounded-lg border px-3 py-2 text-sm" value={referred} onChange={(e) => setReferred(e.target.value)}>
              <option value="">Referred investment</option>
              {others.map((item) => (
                <option key={item.id} value={item.id}>{item.investor_no || item.id} · {item.plan_name}</option>
              ))}
            </select>
            <Button type="submit" disabled={busy || !referred}>{busy ? 'Working...' : 'Apply bonus'}</Button>
            <FieldError message={actionError} />
          </form>
        </section>
      )}
    </div>
  );
}
