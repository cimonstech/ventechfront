'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { payoutStatusVariant } from '@/lib/vlb';
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
  useSetAdminHeading('Upgrade requests');
  const { canEdit } = useAccess();
  const editable = canEdit('vlb');
  const [tab, setTab] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams();
    if (tab) params.set('status', tab);
    setLoading(true);
    return deviceRequest<Row[]>(`/api/admin/vlb/upgrade-requests?${params}`)
      .then((result) => setRows(result.data || []))
      .catch((error) => toast.error(apiMessage(error, 'Could not load upgrade requests')))
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

  return (
    <div className="space-y-6">
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
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Investor</th>
              <th className="px-4 py-3 font-medium">From → To</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={5}>No upgrade requests.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">{nested(row.investors)?.investor_no || '—'}</td>
                <td className="px-4 py-3">
                  {nested(row.vlb_plans)?.name || '—'}
                  {row.message && <p className="text-xs text-[#3A3A3A]">{row.message}</p>}
                </td>
                <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge></td>
                <td className="px-4 py-3">{formatDeviceDate(row.created_at)}</td>
                <td className="px-4 py-3">
                  {editable && row.status === 'new' && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => patch(row.id, 'contacted')}>Contacted</Button>
                      <Button size="sm" onClick={() => patch(row.id, 'done')}>Done</Button>
                      <Button size="sm" variant="outline" onClick={() => patch(row.id, 'declined')}>Decline</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
