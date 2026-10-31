'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '@/lib/authHeaders';
import { apiRequest, toApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader, AdminPagination, AdminRowCard, ResponsiveTable } from '@/components/admin/list';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
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
  const query = useListQuery();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const load = () =>
    query.run(async () => {
      const result = await apiRequest<AuditRow[]>(`/api/admin/audit-log?page=${page}&limit=20`);
      if (!result.ok) throw toApiError(result);
      setRows(result.data || []);
      if (result.pagination) setPagination(result.pagination);
    });

  useEffect(() => {
    void load();
  }, [page]);

  const exportCsv = async () => {
    try {
      setExporting(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/audit-log?format=csv`, {
        headers: await authHeaders(),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to export audit log');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-log.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export audit log');
    } finally {
      setExporting(false);
    }
  };

  if (query.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }

  if (query.error && !query.loaded) {
    return (
      <ErrorState
        title="We couldn't load the audit log"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-w-0">
      {query.updating ? <UpdatingNotice /> : null}
      <AdminPageHeader
        title="Audit log"
        subtitle={`${pagination.total} ${pagination.total === 1 ? 'entry' : 'entries'}`}
        secondary={[{ label: 'Export all', onClick: () => void exportCsv(), disabled: exporting || query.loading }]}
      />
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {rows.length === 0 ? (
        <EmptyState title="No audit entries yet" description="Changes made in admin will show up here." />
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Record</th>
            </tr>
          }
          cards={rows.map((row) => (
            <AdminRowCard
              key={row.id}
              name={row.action}
              facts={[
                { label: 'When', value: new Date(row.created_at).toLocaleString() },
                { label: 'Actor', value: row.actor_role || '—' },
                { label: 'Entity', value: row.entity },
              ]}
            />
          ))}
        >
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">{new Date(row.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-[#1A1A1A]">{row.actor_role || '—'}</td>
              <td className="px-4 py-3 text-sm text-[#1A1A1A]">{row.action}</td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">{row.entity}</td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">{row.entity_id || '—'}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
      <AdminPagination page={page} totalPages={Math.max(pagination.totalPages, 1)} onPage={setPage} />
    </div>
    </div>
  );
}
