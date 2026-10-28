'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { apiMessage, deviceRequest, nested, type VlbApplicationRow } from '@/lib/vlbAdmin';
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
  useSetAdminHeading('Laptop Banking');
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<VlbApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

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
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load applications'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  return (
    <div className="space-y-6">
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
      <div className="overflow-x-auto sticky-first rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={4}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={4}>No applications.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <Link href={`/admin/vlb/applications/${row.id}`} className="font-medium text-[#FF7A19]">
                      {row.full_name}
                    </Link>
                    <p className="text-xs text-[#3A3A3A]">{row.email}</p>
                  </td>
                  <td className="px-4 py-3">{nested(row.vlb_plans)?.name || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge></td>
                  <td className="px-4 py-3">{formatDeviceDate(row.created_at)}</td>
                </tr>
              ))
            )}
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
