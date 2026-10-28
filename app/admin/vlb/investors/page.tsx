'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { apiMessage, deviceRequest } from '@/lib/vlbAdmin';

interface Row {
  id: string;
  investor_no: string | null;
  name: string;
  email: string | null;
  payout_method: string | null;
  created_at?: string;
}

export default function AdminVlbInvestorsPage() {
  useSetAdminHeading('Investors');
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query) params.set('search', query);
    deviceRequest<Row[]>(`/api/admin/vlb/investors?${params}`)
      .then((result) => {
        if (cancelled) return;
        setRows(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
      })
      .catch((error) => {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load investors'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query]);

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/investors" />
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input className="flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="Investor number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="rounded-lg bg-[#FF7A19] px-4 py-2 text-sm font-medium text-white">Search</button>
      </form>
      <div className="overflow-x-auto sticky-first rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Investor</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Payout</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={3}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={3}>No investors.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">
                  <Link href={`/admin/vlb/investors/${row.id}`} className="font-medium text-[#FF7A19]">{row.investor_no || row.id}</Link>
                  <p className="text-xs text-[#3A3A3A]">{row.name}</p>
                </td>
                <td className="px-4 py-3">{row.email || '—'}</td>
                <td className="px-4 py-3">{row.payout_method || '—'}</td>
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
