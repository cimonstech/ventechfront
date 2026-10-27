'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs } from '@/lib/vlb';
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
  useSetAdminHeading('Reports');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [scholar, setScholar] = useState<ScholarReport | null>(null);
  const [payouts, setPayouts] = useState<PayoutsReport | null>(null);
  const [loading, setLoading] = useState(false);

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
      })
      .catch((error) => toast.error(apiMessage(error, 'Could not load reports')))
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

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/reports" />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="text-sm">From
          <input className="mt-1 block rounded-lg border px-3 py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">To
          <input className="mt-1 block rounded-lg border px-3 py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <Button type="submit" disabled={loading}>Apply</Button>
      </form>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[#1A1A1A]">Scholar Fund</h2>
          <Button size="sm" variant="outline" onClick={() => csv('scholar-fund')}>Download CSV</Button>
        </div>
        <p className="mt-1 text-sm text-[#3A3A3A]">
          Total {formatGhs(scholar?.totals.scholar_pesewas || 0)} · {scholar?.totals.count || 0} payouts
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-[#3A3A3A]">
                <th className="pb-2">Investor</th>
                <th className="pb-2">Count</th>
                <th className="pb-2">Scholar</th>
              </tr>
            </thead>
            <tbody>
              {(scholar?.by_investor || []).map((row) => (
                <tr key={row.investor_id} className="border-t">
                  <td className="py-2">{row.investor_no || '—'}</td>
                  <td className="py-2">{row.count}</td>
                  <td className="py-2">{formatGhs(row.scholar_pesewas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[#1A1A1A]">Payouts</h2>
          <Button size="sm" variant="outline" onClick={() => csv('payouts')}>Download CSV</Button>
        </div>
        <p className="mt-1 text-sm text-[#3A3A3A]">
          Net {formatGhs(payouts?.totals.net_pesewas || 0)}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-[#3A3A3A]">
                <th className="pb-2">Investor</th>
                <th className="pb-2">Due</th>
                <th className="pb-2">Paid</th>
                <th className="pb-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {(payouts?.rows || []).map((row, index) => (
                <tr key={`${row.investor_no}-${row.period_no}-${index}`} className="border-t">
                  <td className="py-2">{row.investor_no || '—'}</td>
                  <td className="py-2">{formatDeviceDate(row.due_date)}</td>
                  <td className="py-2">{row.paid_at ? formatDeviceDate(row.paid_at) : '—'}</td>
                  <td className="py-2">{formatGhs(row.net_pesewas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
