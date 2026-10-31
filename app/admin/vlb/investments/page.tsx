'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { AccessDenied, EmptyState, ErrorState, NoResults, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { deviceRequest, type VlbAdminPlan } from '@/lib/vlbAdmin';

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
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<VlbAdminPlan[]>([]);
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

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
        setTotal(result.pagination?.total || 0);
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
      })
      .catch((error) => {
        if (!cancelled) {
          const kind = noteQueryFail(error);
          if (kind === 'forbidden') setForbidden(true);
          else if (kind !== 'unauthorized') setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, planId, month]);

  const count = total || rows.length;
  const filtered = Boolean(status || planId || month);
  const rowName = (row: Row) => row.investor_no || row.id;
  const statusBadge = (row: Row) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>
      {row.agreement_missing ? <Badge variant="error">Agreement missing</Badge> : null}
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Investments"
        subtitle={`${count} investment${count === 1 ? '' : 's'}`}
      />
      <VlbNav current="/admin/vlb/investments" />
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <select
          className={filterSelectClassName()}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="settlement">Settlement</option>
          <option value="settled">Settled</option>
          <option value="renewed">Renewed</option>
        </select>
        <select
          className={filterSelectClassName()}
          value={planId}
          onChange={(e) => { setPlanId(e.target.value); setPage(1); }}
        >
          <option value="">All plans</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>{plan.name} {plan.version}</option>
          ))}
        </select>
        <input
          className={filterSelectClassName()}
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
        />
      </div>
      {forbidden ? (
        <AccessDenied title="You don't have access" description="You don't have access to this data." primary={{ label: 'Go back', href: '/admin' }} />
      ) : failed && !loaded ? (
        <ErrorState title="We couldn't load investments" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => setPage(1) }} />
      ) : loading && !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 && filtered ? (
        <NoResults primary={{ label: 'Clear filters', onClick: () => { setStatus(''); setPlanId(''); setMonth(''); }} } />
      ) : rows.length === 0 ? (
        <EmptyState title="No investments yet" description="Investments will show up here after applications are activated." />
      ) : (
        <>
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Investor</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Maturity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((row) => (
              <AdminRowCard
                key={row.id}
                name={rowName(row)}
                href={`/admin/vlb/investments/${row.id}`}
                status={statusBadge(row)}
                facts={[
                  { label: 'Plan', value: row.plan_name },
                  { label: 'Principal', value: formatGhs(row.principal_pesewas) },
                  { label: 'Term', value: row.current_term },
                  { label: 'Maturity', value: formatDeviceDate(row.maturity_date) },
                ]}
                actions={
                  <RowActions
                    name={rowName(row)}
                    actions={[{ label: 'View', href: `/admin/vlb/investments/${row.id}` }]}
                  />
                }
              />
            ))}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/vlb/investments/${row.id}`} className="font-medium text-[#FF7A19]">{rowName(row)}</Link>
                </td>
                <td className="px-4 py-3">{row.plan_name}</td>
                <td className="px-4 py-3">{formatGhs(row.principal_pesewas)}</td>
                <td className="px-4 py-3">{row.current_term}</td>
                <td className="px-4 py-3">{formatDeviceDate(row.maturity_date)}</td>
                <td className="px-4 py-3">{statusBadge(row)}</td>
                <td className="px-4 py-3 text-right">
                  <RowActions
                    name={rowName(row)}
                    actions={[{ label: 'View', href: `/admin/vlb/investments/${row.id}` }]}
                  />
                </td>
              </tr>
            ))}
          </ResponsiveTable>
          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
