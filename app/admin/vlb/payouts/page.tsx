'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InfoNote } from '@/components/ui/InfoNote';
import { Sheet } from '@/components/ui/Sheet';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  ResponsiveTable,
} from '@/components/admin/list';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { EmptyState, FieldError, TableSkeleton } from '@/components/ui-states';
import { AdminQueryFail } from '@/components/admin/AdminQueryFail';
import { applyQueryFail } from '@/lib/queryState';
import { apiMessage, deviceRequest, payoutQueueMeta, type VlbPayoutQueueRow } from '@/lib/vlbAdmin';
import { downloadAuthFile } from '@/lib/vlb';

const TABS = [
  { id: 'this_week', label: 'This week' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due', label: 'Due' },
  { id: 'paid', label: 'Paid' },
];

export default function AdminVlbPayoutsPage() {
  const { canView, canMoveVlbMoney } = useAccess();
  const money = canMoveVlbMoney;
  const financeView = canView('finance');
  const [tab, setTab] = useState('this_week');
  const [rows, setRows] = useState<VlbPayoutQueueRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [featureOff, setFeatureOff] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
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
        setTotal(result.pagination?.total || 0);
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
        setFeatureOff(false);
      })
      .catch((error) => {
        applyQueryFail(error, { setFeatureOff, setForbidden, setFailed });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, [tab, page]);

  const markPaid = async (event: FormEvent) => {
    event.preventDefault();
    if (!markId || busy) return;
    setBusy(true);
    setMarkError(null);
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
      setMarkError(apiMessage(error, 'Could not mark this payout paid.'));
    } finally {
      setBusy(false);
    }
  };

  const detailsText = (row: VlbPayoutQueueRow) => {
    const details = row.payout_details;
    if (details?.payout_method === 'momo') {
      return `${details.momo_network || 'MoMo'} · ${details.momo_number || '—'}`;
    }
    if (details?.payout_method === 'bank') {
      return `${details.bank_name || 'Bank'} · ${details.bank_account_name || ''} · ${details.bank_account_number || '—'}`;
    }
    return 'Not set';
  };

  const rowActions = (row: VlbPayoutQueueRow) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {money && (row.status === 'due' || row.status === 'processing') && (
        <Button size="sm" variant="outline" onClick={() => { setMarkId(row.id); setPaidAt(new Date().toISOString().slice(0, 10)); }}>
          Mark paid
        </Button>
      )}
      {row.status === 'paid' && (
        <button
          type="button"
          className="text-sm font-medium text-[#FF7A19]"
          onClick={() => downloadAuthFile(
            `/api/admin/vlb/payouts/${row.id}/receipt.pdf`,
            `vlb-receipt-${row.id}.pdf`
          ).catch((error) => toast.error(apiMessage(error, 'Could not download this receipt.')))}
        >
          Receipt
        </button>
      )}
    </div>
  );

  const count = total || rows.length;

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Payouts"
        subtitle={`${count} payout${count === 1 ? '' : 's'}`}
      />
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
      {featureOff || forbidden || (failed && !loaded) ? (
        <AdminQueryFail
          featureOff={featureOff}
          forbidden={forbidden}
          failed={failed}
          loaded={loaded}
          feature="Laptop Banking"
          onRetry={() => void load()}
          errorTitle="We couldn't load payouts"
        />
      ) : loading && !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No payouts in this list yet" description="Payouts for this period will show up here." />
      ) : (
        <>
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Investor</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Net</th>
                {financeView && <th className="px-4 py-3">Payout details</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((row) => {
              const meta = payoutQueueMeta(row);
              return (
                <AdminRowCard
                  key={row.id}
                  name={meta.investor_no || '—'}
                  status={<Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>}
                  facts={[
                    { label: 'Plan', value: meta.plan_name },
                    { label: 'Period', value: `${row.type} ${row.period_no}` },
                    { label: 'Due', value: formatDeviceDate(row.due_date) },
                    { label: 'Net', value: formatGhs(row.net_pesewas) },
                    ...(financeView ? [{ label: 'Payout', value: detailsText(row) }] : []),
                  ]}
                  actions={rowActions(row)}
                />
              );
            })}
          >
            {rows.map((row) => {
              const meta = payoutQueueMeta(row);
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{meta.investor_no || '—'}<p className="text-xs text-[#3A3A3A]">{meta.plan_name}</p></td>
                  <td className="px-4 py-3">{row.type} {row.period_no}</td>
                  <td className="px-4 py-3">{formatDeviceDate(row.due_date)}</td>
                  <td className="px-4 py-3">{formatGhs(row.net_pesewas)}</td>
                  {financeView && (
                    <td className="px-4 py-3 text-xs text-[#3A3A3A]">{detailsText(row)}</td>
                  )}
                  <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge></td>
                  <td className="px-4 py-3 text-right">{rowActions(row)}</td>
                </tr>
              );
            })}
          </ResponsiveTable>
          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
      {markId && (
        <Sheet
          title="Mark paid"
          onClose={() => setMarkId(null)}
          footer={(
            <div className="flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" className="min-w-0 flex-1 sm:flex-none sm:w-auto" onClick={() => setMarkId(null)}>Cancel</Button>
              <Button type="submit" form="vlb-mark-paid" className="min-w-0 flex-1 sm:flex-none sm:w-auto" disabled={busy}>{busy ? 'Working...' : 'Confirm'}</Button>
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
            <FieldError message={markError} />
          </form>
        </Sheet>
      )}
    </div>
  );
}
