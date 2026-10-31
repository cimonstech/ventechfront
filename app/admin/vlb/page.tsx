'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { deviceRequest, nested, type VlbApplicationRow } from '@/lib/vlbAdmin';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { payoutStatusVariant } from '@/lib/vlb';

const TABS = [
  { id: '', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'activated', label: 'Activated' },
  { id: 'declined', label: 'Declined' },
];

export default function AdminVlbApplicationsPage() {
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<VlbApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (tab) params.set('status', tab);
      try {
        const result = await deviceRequest<VlbApplicationRow[]>(`/api/admin/vlb/applications?${params}`);
        if (cancelled) return;
        setRows(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotal(result.pagination?.total || 0);
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
      } catch (error) {
        if (!cancelled) {
          const kind = noteQueryFail(error);
          if (kind === 'forbidden') setForbidden(true);
          else if (kind !== 'unauthorized') setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  const count = total || rows.length;

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Laptop Banking"
        subtitle={`${count} application${count === 1 ? '' : 's'}`}
      />
      <VlbNav current="/admin/vlb" />
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id || 'all'}
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
      {forbidden ? (
        <AccessDenied title="You don't have access" description="You don't have access to this data." primary={{ label: 'Go back', href: '/admin' }} />
      ) : failed && !loaded ? (
        <ErrorState title="We couldn't load applications" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => setPage(1) }} />
      ) : loading && !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 && tab ? (
        <EmptyState title="No applications in this list yet" description="Try another status, or wait for new applications." />
      ) : rows.length === 0 ? (
        <EmptyState title="No applications yet" description="Laptop Banking applications will show up here." />
      ) : (
        <>
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((row) => (
              <AdminRowCard
                key={row.id}
                name={row.full_name}
                href={`/admin/vlb/applications/${row.id}`}
                status={<Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>}
                facts={[
                  { label: 'Email', value: row.email },
                  { label: 'Plan', value: nested(row.vlb_plans)?.name || '—' },
                  { label: 'Date', value: formatDeviceDate(row.created_at) },
                ]}
                actions={
                  <RowActions
                    name={row.full_name}
                    actions={[{ label: 'View', href: `/admin/vlb/applications/${row.id}` }]}
                  />
                }
              />
            ))}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/vlb/applications/${row.id}`} className="font-medium text-[#FF7A19]">
                    {row.full_name}
                  </Link>
                  <p className="text-xs text-[#3A3A3A]">{row.email}</p>
                </td>
                <td className="px-4 py-3">{nested(row.vlb_plans)?.name || '—'}</td>
                <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge></td>
                <td className="px-4 py-3">{formatDeviceDate(row.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <RowActions
                    name={row.full_name}
                    actions={[{ label: 'View', href: `/admin/vlb/applications/${row.id}` }]}
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
