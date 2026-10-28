'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { apiMessage, deviceRequest, type VlbAdminPlan } from '@/lib/vlbAdmin';

interface Row {
  id: string;
  investor_no: string | null;
  plan_name: string;
  principal_pesewas: number;
  start_date: string;
  maturity_date: string;
  status: string;
  current_term: number;
  agreement_missing?: boolean;
}

export default function AdminVlbInvestmentsPage() {
  useSetAdminHeading('Investments');
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<VlbAdminPlan[]>([]);
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deviceRequest<VlbAdminPlan[]>('/api/admin/vlb/plans')
      .then((result) => setPlans(result.data || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    if (planId) params.set('plan_id', planId);
    if (month) params.set('maturity_month', month);
    setLoading(true);
    deviceRequest<Row[]>(`/api/admin/vlb/investments?${params}`)
      .then((result) => {
        if (cancelled) return;
        setRows(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
      })
      .catch((error) => {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load investments'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, planId, month]);

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/investments" />
      <div className="flex flex-wrap gap-2">
        <select className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="settlement">Settlement</option>
          <option value="settled">Settled</option>
          <option value="renewed">Renewed</option>
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={planId} onChange={(e) => { setPlanId(e.target.value); setPage(1); }}>
          <option value="">All plans</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>{plan.name} {plan.version}</option>
          ))}
        </select>
        <input className="rounded-lg border px-3 py-2 text-sm" type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} />
      </div>
      <div className="overflow-x-auto sticky-first rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Investor</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Principal</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Maturity</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={6}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={6}>No investments.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">
                  <Link href={`/admin/vlb/investments/${row.id}`} className="font-medium text-[#FF7A19]">{row.investor_no || row.id}</Link>
                </td>
                <td className="px-4 py-3">{row.plan_name}</td>
                <td className="px-4 py-3">{formatGhs(row.principal_pesewas)}</td>
                <td className="px-4 py-3">{row.current_term}</td>
                <td className="px-4 py-3">{formatDeviceDate(row.maturity_date)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>
                    {row.agreement_missing ? <Badge variant="error">Agreement missing</Badge> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
