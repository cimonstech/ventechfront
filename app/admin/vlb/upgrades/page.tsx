'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminRowCard,
  ResponsiveTable,
} from '@/components/admin/list';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { payoutStatusVariant } from '@/lib/vlb';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { apiMessage, deviceRequest, nested } from '@/lib/vlbAdmin';

interface Row {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  investors?: { investor_no?: string | null } | Array<{ investor_no?: string | null }> | null;
  vlb_plans?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

const TABS = [
  { id: '', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'done', label: 'Done' },
  { id: 'declined', label: 'Declined' },
];

export default function AdminVlbUpgradesPage() {
  const { canEdit } = useAccess();
  const editable = canEdit('vlb');
  const [tab, setTab] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (tab) params.set('status', tab);
    setLoading(true);
    return deviceRequest<Row[]>(`/api/admin/vlb/upgrade-requests?${params}`)
      .then((result) => {
        setRows(result.data || []);
        setLoaded(true);
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
  }, [tab]);

  const patch = async (id: string, status: string) => {
    try {
      await deviceRequest(`/api/admin/vlb/upgrade-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success('Updated.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update this request.'));
    }
  };

  const rowName = (row: Row) => nested(row.investors)?.investor_no || '—';
  const planName = (row: Row) => nested(row.vlb_plans)?.name || '—';
  const statusActions = (row: Row) => (
    editable && row.status === 'new' ? (
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => patch(row.id, 'contacted')}>Contacted</Button>
        <Button size="sm" onClick={() => patch(row.id, 'done')}>Done</Button>
        <Button size="sm" variant="outline" onClick={() => patch(row.id, 'declined')}>Decline</Button>
      </div>
    ) : null
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Upgrade requests"
        subtitle={`${rows.length} request${rows.length === 1 ? '' : 's'}`}
      />
      <VlbNav current="/admin/vlb/upgrades" />
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id || 'all'}
            type="button"
            onClick={() => setTab(item.id)}
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
        <ErrorState title="We couldn't load upgrade requests" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => void load() }} />
      ) : loading && !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No upgrade requests yet" description="Upgrade requests will show up here." />
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Investor</th>
              <th className="px-4 py-3">From ? To</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={rows.map((row) => (
            <AdminRowCard
              key={row.id}
              name={rowName(row)}
              status={<Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>}
              facts={[
                { label: 'Plan', value: planName(row) },
                { label: 'Date', value: formatDeviceDate(row.created_at) },
                ...(row.message ? [{ label: 'Message', value: row.message }] : []),
              ]}
              actions={statusActions(row)}
            />
          ))}
        >
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">{rowName(row)}</td>
              <td className="px-4 py-3">
                {planName(row)}
                {row.message && <p className="text-xs text-[#3A3A3A]">{row.message}</p>}
              </td>
              <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge></td>
              <td className="px-4 py-3">{formatDeviceDate(row.created_at)}</td>
              <td className="px-4 py-3 text-right">{statusActions(row)}</td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
    </div>
  );
}
