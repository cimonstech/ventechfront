'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '@/lib/authHeaders';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface AuditRow {
  id: string;
  actor_role: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/admin/audit-log?page=${page}&limit=20`, {
          headers: await authHeaders(),
        });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          throw new Error(payload.message || 'Failed to load audit log');
        }
        setRows(payload.data || []);
        if (payload.pagination) setPagination(payload.pagination);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Audit log</h2>
        <p className="text-sm text-[#3A3A3A] mt-1">Changes recorded by the admin API</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-6 py-12 text-center text-[#3A3A3A]">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto sticky-first">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A1A1A]">When</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A1A1A]">Actor</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A1A1A]">Action</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A1A1A]">Entity</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A1A1A]">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-[#3A3A3A]">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm text-[#1A1A1A]">{row.actor_role || '—'}</td>
                  <td className="px-6 py-3 text-sm text-[#1A1A1A]">{row.action}</td>
                  <td className="px-6 py-3 text-sm text-[#3A3A3A]">{row.entity}</td>
                  <td className="px-6 py-3 text-sm text-[#3A3A3A]">{row.entity_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-6 py-4 border-t flex items-center justify-between">
        <p className="text-sm text-[#3A3A3A]">
          Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
