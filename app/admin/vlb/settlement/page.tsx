'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { apiMessage, deviceRequest } from '@/lib/vlbAdmin';

interface Row {
  id: string;
  investor_no: string | null;
  plan_name: string;
  principal_pesewas: number;
  maturity_date: string;
  renewal_choice: string;
}

export default function AdminVlbSettlementPage() {
  useSetAdminHeading('Settlement');
  const { canEdit } = useAccess();
  const money = canEdit('vlb') && canEdit('finance');
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    deviceRequest<Row[]>('/api/admin/vlb/settlement')
      .then((result) => setRows(result.data || []))
      .catch((error) => toast.error(apiMessage(error, 'Could not load settlement queue')));

  useEffect(() => {
    void load();
  }, []);

  const act = async (id: string, action: 'settle' | 'renew') => {
    setBusyId(id);
    try {
      await deviceRequest(`/api/admin/vlb/investments/${id}/${action}`, { method: 'POST' });
      toast.success(action === 'settle' ? 'Settled.' : 'Renewed.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not complete this action.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/settlement" />
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-[#3A3A3A]">
              <th className="px-4 py-3 font-medium">Investor</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Principal</th>
              <th className="px-4 py-3 font-medium">Maturity</th>
              <th className="px-4 py-3 font-medium">Choice</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-[#3A3A3A]" colSpan={6}>Nothing in settlement this month.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">
                  <Link href={`/admin/vlb/investments/${row.id}`} className="font-medium text-[#FF7A19]">{row.investor_no || row.id}</Link>
                </td>
                <td className="px-4 py-3">{row.plan_name}</td>
                <td className="px-4 py-3">{formatGhs(row.principal_pesewas)}</td>
                <td className="px-4 py-3">{formatDeviceDate(row.maturity_date)}</td>
                <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.renewal_choice)}>{row.renewal_choice || '—'}</Badge></td>
                <td className="px-4 py-3">
                  {money && (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busyId === row.id} onClick={() => act(row.id, 'settle')}>Settle</Button>
                      <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => act(row.id, 'renew')}>Renew</Button>
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
