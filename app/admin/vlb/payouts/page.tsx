'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { apiMessage, deviceRequest, payoutQueueMeta, type VlbPayoutQueueRow } from '@/lib/vlbAdmin';

const TABS = [
  { id: 'this_week', label: 'This week' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due', label: 'Due' },
  { id: 'paid', label: 'Paid' },
];

export default function AdminVlbPayoutsPage() {
  useSetAdminHeading('Payouts');
  const { canEdit } = useAccess();
  const money = canEdit('vlb') && canEdit('finance');
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
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Investor</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={6}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={6}>No payouts.</td></tr>
            ) : rows.map((row) => {
              const meta = payoutQueueMeta(row);
              return (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">{meta.investor_no || '—'}<p className="text-xs text-[#3A3A3A]">{meta.plan_name}</p></td>
                <td className="px-4 py-3">{row.type} {row.period_no}</td>
                <td className="px-4 py-3">{formatDeviceDate(row.due_date)}</td>
                <td className="px-4 py-3">{formatGhs(row.net_pesewas)}</td>
                <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge></td>
                <td className="px-4 py-3">
                  {money && (row.status === 'due' || row.status === 'processing') && (
                    <Button size="sm" variant="outline" onClick={() => { setMarkId(row.id); setPaidAt(new Date().toISOString().slice(0, 10)); }}>
                      Mark paid
                    </Button>
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
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6" onSubmit={markPaid}>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Mark paid</h2>
            <label className="block text-sm">Method
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={method} onChange={(e) => setMethod(e.target.value)} required />
            </label>
            <label className="block text-sm">Reference
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={reference} onChange={(e) => setReference(e.target.value)} required />
            </label>
            <label className="block text-sm">Date
              <input className="mt-1 w-full rounded-lg border px-3 py-2" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>Confirm</Button>
              <Button type="button" variant="outline" onClick={() => setMarkId(null)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
