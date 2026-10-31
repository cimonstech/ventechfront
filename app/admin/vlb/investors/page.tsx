'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  FilterBar,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { AccessDenied, EmptyState, ErrorState, NoResults, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { deviceRequest } from '@/lib/vlbAdmin';

interface Row {
  id: string;
  investor_no: string | null;
  name: string;
  email: string | null;
  payout_method: string | null;
  created_at?: string;
}

export default function AdminVlbInvestorsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query) params.set('search', query);
    deviceRequest<Row[]>(`/api/admin/vlb/investors?${params}`)
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
  }, [page, query]);

  const count = total || rows.length;
  const rowName = (row: Row) => row.investor_no || row.id;

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Investors"
        subtitle={`${count} investor${count === 1 ? '' : 's'}`}
      />
      <VlbNav current="/admin/vlb/investors" />
      <FilterBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
          setQuery(value.trim());
        }}
        searchPlaceholder="Search investors"
      />
      {forbidden ? (
        <AccessDenied title="You don't have access" description="You don't have access to this data." primary={{ label: 'Go back', href: '/admin' }} />
      ) : failed && !loaded ? (
        <ErrorState title="We couldn't load investors" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => setPage(1) }} />
      ) : loading && !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 && query ? (
        <NoResults primary={{ label: 'Clear filters', onClick: () => { setQuery(''); setSearch(''); }} } />
      ) : rows.length === 0 ? (
        <EmptyState title="No investors yet" description="Investors will show up here after applications are activated." />
      ) : (
        <>
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Investor</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Payout</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((row) => (
              <AdminRowCard
                key={row.id}
                name={rowName(row)}
                href={`/admin/vlb/investors/${row.id}`}
                facts={[
                  { label: 'Name', value: row.name || '—' },
                  { label: 'Email', value: row.email || '—' },
                  { label: 'Payout', value: row.payout_method || '—' },
                ]}
                actions={
                  <RowActions
                    name={rowName(row)}
                    actions={[{ label: 'View', href: `/admin/vlb/investors/${row.id}` }]}
                  />
                }
              />
            ))}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/vlb/investors/${row.id}`} className="font-medium text-[#FF7A19]">{rowName(row)}</Link>
                  <p className="text-xs text-[#3A3A3A]">{row.name}</p>
                </td>
                <td className="px-4 py-3">{row.email || '—'}</td>
                <td className="px-4 py-3">{row.payout_method || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <RowActions
                    name={rowName(row)}
                    actions={[{ label: 'View', href: `/admin/vlb/investors/${row.id}` }]}
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
