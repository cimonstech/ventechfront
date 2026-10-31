'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminRowCard,
  ResponsiveTable,
} from '@/components/admin/list';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs } from '@/lib/vlb';
import { AccessDenied, EmptyState, ErrorState } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { apiMessage, deviceRequest, downloadVlbCsv } from '@/lib/vlbAdmin';

interface ScholarReport {
  from: string;
  to: string;
  by_month: Array<{ month: string; scholar_pesewas: number; count: number }>;
  by_investor: Array<{ investor_id: string; investor_no: string | null; scholar_pesewas: number; count: number }>;
  totals: { scholar_pesewas: number; count: number };
}

interface PayoutsReport {
  from: string;
  to: string;
  rows: Array<{
    investor_no: string | null;
    type: string;
    period_no: number;
    due_date: string;
    paid_at: string | null;
    net_pesewas: number;
    scholar_pesewas: number;
    status?: string;
  }>;
  totals: { net_pesewas: number; scholar_pesewas: number; count: number };
}

function monthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminVlbReportsPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [scholar, setScholar] = useState<ScholarReport | null>(null);
  const [payouts, setPayouts] = useState<PayoutsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = () => {
    const params = new URLSearchParams({ from, to });
    setLoading(true);
    Promise.all([
      deviceRequest<ScholarReport>(`/api/admin/vlb/reports/scholar-fund?${params}`),
      deviceRequest<PayoutsReport>(`/api/admin/vlb/reports/payouts?${params}`),
    ])
      .then(([scholarResult, payoutResult]) => {
        setScholar(scholarResult.data);
        setPayouts(payoutResult.data);
        setFailed(false);
        setForbidden(false);
      })
      .catch((error) => {
        const kind = noteQueryFail(error);
        if (kind === 'forbidden') setForbidden(true);
        else if (kind !== 'unauthorized') setFailed(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const csv = async (kind: 'scholar-fund' | 'payouts') => {
    try {
      await downloadVlbCsv(`/api/admin/vlb/reports/${kind}?from=${from}&to=${to}&format=csv`, `vlb-${kind}.csv`);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not download this report.'));
    }
  };

  const payoutCount = payouts?.totals.count || 0;
  const scholarRows = scholar?.by_investor || [];
  const payoutRows = payouts?.rows || [];

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Reports"
        subtitle={`${payoutCount} payout${payoutCount === 1 ? '' : 's'}`}
        secondary={[
          { label: 'Export scholar fund', onClick: () => void csv('scholar-fund') },
          { label: 'Export payouts', onClick: () => void csv('payouts') },
        ]}
      />
      <VlbNav current="/admin/vlb/reports" />
      {forbidden ? (
        <AccessDenied title="You don't have access" description="You don't have access to this data." primary={{ label: 'Go back', href: '/admin' }} />
      ) : failed && !scholar && !payouts ? (
        <ErrorState title="We couldn't load reports" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => void load() }} />
      ) : (
        <>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <label className="text-sm">From
              <input className="mt-1 block min-h-11 rounded-lg border px-3 py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-sm">To
              <input className="mt-1 block min-h-11 rounded-lg border px-3 py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <Button type="submit" disabled={loading}>Apply</Button>
          </form>

          <section className="space-y-3">
            <div>
              <h2 className="font-semibold text-[#1A1A1A]">Scholar Fund</h2>
              <p className="mt-1 text-sm text-[#3A3A3A]">
                Total {formatGhs(scholar?.totals.scholar_pesewas || 0)} · {scholar?.totals.count || 0} payouts
              </p>
            </div>
            {scholar && scholarRows.length === 0 ? (
              <EmptyState title="No scholar fund rows" description="Scholar fund totals for this range will show up here." />
            ) : scholarRows.length === 0 ? null : (
              <ResponsiveTable
                headers={
                  <tr>
                    <th className="px-4 py-3">Investor</th>
                    <th className="px-4 py-3">Count</th>
                    <th className="px-4 py-3">Scholar</th>
                  </tr>
                }
                cards={scholarRows.map((row) => (
                  <AdminRowCard
                    key={row.investor_id}
                    name={row.investor_no || '—'}
                    facts={[
                      { label: 'Count', value: row.count },
                      { label: 'Scholar', value: formatGhs(row.scholar_pesewas) },
                    ]}
                  />
                ))}
              >
                {scholarRows.map((row) => (
                  <tr key={row.investor_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.investor_no || '—'}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3">{formatGhs(row.scholar_pesewas)}</td>
                  </tr>
                ))}
              </ResponsiveTable>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-semibold text-[#1A1A1A]">Payouts</h2>
              <p className="mt-1 text-sm text-[#3A3A3A]">
                Net {formatGhs(payouts?.totals.net_pesewas || 0)}
              </p>
            </div>
            {payouts && payoutRows.length === 0 ? (
              <EmptyState title="No payout rows" description="Payouts for this range will show up here." />
            ) : payoutRows.length === 0 ? null : (
              <ResponsiveTable
                headers={
                  <tr>
                    <th className="px-4 py-3">Investor</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Net</th>
                  </tr>
                }
                cards={payoutRows.map((row, index) => (
                  <AdminRowCard
                    key={`${row.investor_no}-${row.period_no}-${index}`}
                    name={row.investor_no || '—'}
                    facts={[
                      { label: 'Due', value: formatDeviceDate(row.due_date) },
                      { label: 'Paid', value: row.paid_at ? formatDeviceDate(row.paid_at) : '—' },
                      { label: 'Net', value: formatGhs(row.net_pesewas) },
                    ]}
                  />
                ))}
              >
                {payoutRows.map((row, index) => (
                  <tr key={`${row.investor_no}-${row.period_no}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{row.investor_no || '—'}</td>
                    <td className="px-4 py-3">{formatDeviceDate(row.due_date)}</td>
                    <td className="px-4 py-3">{row.paid_at ? formatDeviceDate(row.paid_at) : '—'}</td>
                    <td className="px-4 py-3">{formatGhs(row.net_pesewas)}</td>
                  </tr>
                ))}
              </ResponsiveTable>
            )}
          </section>
        </>
      )}
    </div>
  );
}
