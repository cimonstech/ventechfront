'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InfoNote } from '@/components/ui/InfoNote';
import { Sheet } from '@/components/ui/Sheet';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { apiMessage, deviceRequest, payoutQueueMeta, type VlbPayoutQueueRow } from '@/lib/vlbAdmin';
import { downloadAuthFile } from '@/lib/vlb';

const TABS = [
  { id: 'this_week', label: 'This week' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due', label: 'Due' },
  { id: 'paid', label: 'Paid' },
];

export default function AdminVlbPayoutsPage() {
  useSetAdminHeading('Payouts');
  const { canEdit, canView } = useAccess();
  const money = canEdit('vlb') && canEdit('finance');
  const financeView = canView('finance');
  const [tab, setTab] = useState('this_week');
  const [rows, setRows] = useState<VlbPayoutQueueRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markId, setMarkId] = useState<string | null>(null);
  const [method, setMethod] = useState('momo');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    const params = new URLSearchParams({ page: String(page), limit: '20', range: tab });
    setLoading(true);
    return deviceRequest<VlbPayoutQueueRow[]>(`/api/admin/vlb/payouts?${params}`)
      .then((result) => {
        setRows(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
      })
      .catch((error) => toast.error(apiMessage(error, 'Could not load payouts')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, [tab, page]);

  const markPaid = async (event: FormEvent) => {
    event.preventDefault();
    if (!markId) return;
    setBusy(true);
    try {
      await deviceRequest(`/api/admin/vlb/payouts/${markId}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          method,
          reference,
          paid_at: paidAt || undefined,
        }),
      });
      toast.success('Marked paid.');
      setMarkId(null);
      setReference('');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not mark this payout paid.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/payouts" />
      {money ? (
        <InfoNote>
          Marking a payment as paid does not send money. Send it first through MoMo or the bank, then record the reference here.
        </InfoNote>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === item.id ? 'bg-[#FF7A19] text-white' : 'bg-white border border-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto sticky-first rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Investor</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Net</th>
              {financeView && <th className="px-4 py-3 font-medium">Payout details</th>}
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={financeView ? 7 : 6}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={financeView ? 7 : 6}>No payouts.</td></tr>
            ) : rows.map((row) => {
              const meta = payoutQueueMeta(row);
              const details = row.payout_details;
              return (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">{meta.investor_no || '—'}<p className="text-xs text-[#3A3A3A]">{meta.plan_name}</p></td>
                <td className="px-4 py-3">{row.type} {row.period_no}</td>
                <td className="px-4 py-3">{formatDeviceDate(row.due_date)}</td>
                <td className="px-4 py-3">{formatGhs(row.net_pesewas)}</td>
                {financeView && (
                  <td className="px-4 py-3 text-xs text-[#3A3A3A]">
                    {details?.payout_method === 'momo'
                      ? `${details.momo_network || 'MoMo'} · ${details.momo_number || '—'}`
                      : details?.payout_method === 'bank'
                        ? `${details.bank_name || 'Bank'} · ${details.bank_account_name || ''} · ${details.bank_account_number || '—'}`
                        : 'Not set'}
                  </td>
                )}
                <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge></td>
                <td className="px-4 py-3">
                  {money && (row.status === 'due' || row.status === 'processing') && (
                    <Button size="sm" variant="outline" onClick={() => { setMarkId(row.id); setPaidAt(new Date().toISOString().slice(0, 10)); }}>
                      Mark paid
                    </Button>
                  )}
                  {row.status === 'paid' && (
                    <button
                      type="button"
                      className="ml-2 text-sm text-[#FF7A19]"
                      onClick={() => downloadAuthFile(
                        `/api/admin/vlb/payouts/${row.id}/receipt.pdf`,
                        `vlb-receipt-${row.id}.pdf`
                      ).catch((error) => toast.error(apiMessage(error, 'Could not download this receipt.')))}
                    >
                      Receipt
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      {markId && (
        <Sheet
          title="Mark paid"
          onClose={() => setMarkId(null)}
          footer={(
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setMarkId(null)}>Cancel</Button>
              <Button type="submit" form="vlb-mark-paid" className="w-full sm:w-auto" disabled={busy}>Confirm</Button>
            </div>
          )}
        >
          <form id="vlb-mark-paid" className="space-y-3" onSubmit={markPaid}>
            <InfoNote>
              Marking a payment as paid does not send money. Send it first through MoMo or the bank, then record the reference here.
            </InfoNote>
            <label className="block text-sm">Method
              <input className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2" value={method} onChange={(e) => setMethod(e.target.value)} required />
            </label>
            <label className="block text-sm">Reference
              <input className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2" value={reference} onChange={(e) => setReference(e.target.value)} required />
            </label>
            <label className="block text-sm">Date
              <input className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
            </label>
          </form>
        </Sheet>
      )}
    </div>
  );
}
