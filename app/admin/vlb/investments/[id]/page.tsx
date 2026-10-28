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
  const { canEdit } = useAccess();
  const editable = canEdit('vlb');
  const money = canEdit('vlb') && canEdit('finance');
  const [row, setRow] = useState<Detail | null>(null);
  const [others, setOthers] = useState<InvestmentListRow[]>([]);
  const [note, setNote] = useState('');
  const [orderId, setOrderId] = useState('');
  const [referred, setReferred] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    deviceRequest<Detail>(`/api/admin/vlb/investments/${id}`).then((result) => setRow(result.data));

  useEffect(() => {
    if (!id) return;
    load().catch((error) => toast.error(apiMessage(error, 'Could not load this investment.')));
    deviceRequest<InvestmentListRow[]>('/api/admin/vlb/investments?limit=100')
      .then((result) => setOthers((result.data || []).filter((item) => item.id !== id)))
      .catch(() => undefined);
  }, [id]);

  if (!row) return <p className="text-sm text-[#3A3A3A]">Loading investment…</p>;

  const run = async (path: string, body?: unknown, ok = 'Saved.') => {
    setBusy(true);
    try {
      await deviceRequest(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      toast.success(ok);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save this change.'));
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
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/investments" />
      <Link href="/admin/vlb/investments" className="text-sm font-medium text-[#FF7A19]">Back to investments</Link>
      <div className="rounded-xl bg-white p-6 shadow-sm">
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
            <Button disabled={busy} onClick={() => run(`/api/admin/vlb/investments/${id}/settle`, undefined, 'Settled.')}>Settle</Button>
            <Button variant="outline" disabled={busy} onClick={() => run(`/api/admin/vlb/investments/${id}/renew`, undefined, 'Renewed.')}>Renew</Button>
          </div>
        )}
      </div>

      <section className="overflow-x-auto sticky-first rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#1A1A1A]">Schedule</h2>
        <table className="mt-3 min-w-[40rem] w-full text-left text-sm">
          <thead>
            <tr className="text-[#3A3A3A]">
              <th className="pb-2">Period</th>
              <th className="pb-2">Due</th>
              <th className="pb-2">Gross</th>
              <th className="pb-2">Scholar</th>
              <th className="pb-2">Net</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Ref</th>
            </tr>
          </thead>
          <tbody>
            {row.schedule.map((payout) => (
              <tr key={payout.id} className="border-t">
                <td className="py-2">{payout.period_no}</td>
                <td className="py-2">{formatDeviceDate(payout.due_date)}</td>
                <td className="py-2">{formatGhs(payout.gross_pesewas)}</td>
                <td className="py-2">{formatGhs(payout.scholar_pesewas)}</td>
                <td className="py-2">{formatGhs(payout.net_pesewas)}</td>
                <td className="py-2"><Badge size="sm" variant={payoutStatusVariant(payout.status)}>{payout.status}</Badge></td>
                <td className="py-2">
                  {payout.reference || '—'}
                  {payout.status === 'paid' && (
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
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editable && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
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
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
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
            <select className="min-w-[12rem] flex-1 rounded-lg border px-3 py-2 text-sm" value={referred} onChange={(e) => setReferred(e.target.value)}>
              <option value="">Referred investment</option>
              {others.map((item) => (
                <option key={item.id} value={item.id}>{item.investor_no || item.id} · {item.plan_name}</option>
              ))}
            </select>
            <Button type="submit" disabled={busy || !referred}>Apply bonus</Button>
          </form>
        </section>
      )}
    </div>
  );
}
