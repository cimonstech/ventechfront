'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import {
  AdminPageHeader,
  AdminRowCard,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
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
  const { canEdit } = useAccess();
  const money = canEdit('vlb') && canEdit('finance');
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = () =>
    deviceRequest<Row[]>('/api/admin/vlb/settlement')
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
      });

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

  const rowName = (row: Row) => row.investor_no || row.id;
  const moneyActions = (row: Row) => (
    money ? (
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" disabled={busyId === row.id} onClick={() => act(row.id, 'settle')}>Settle</Button>
        <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => act(row.id, 'renew')}>Renew</Button>
      </div>
    ) : null
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Settlement"
        subtitle={`${rows.length} investment${rows.length === 1 ? '' : 's'}`}
      />
      <VlbNav current="/admin/vlb/settlement" />
      {forbidden ? (
        <AccessDenied title="You don't have access" description="You don't have access to this data." primary={{ label: 'Go back', href: '/admin' }} />
      ) : failed && !loaded ? (
        <ErrorState title="We couldn't load settlement" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => void load() }} />
      ) : !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing in settlement this month" description="Investments due for settlement will show up here." />
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Investor</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Principal</th>
              <th className="px-4 py-3">Maturity</th>
              <th className="px-4 py-3">Choice</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={rows.map((row) => (
            <AdminRowCard
              key={row.id}
              name={rowName(row)}
              href={`/admin/vlb/investments/${row.id}`}
              status={<Badge variant={payoutStatusVariant(row.renewal_choice)}>{row.renewal_choice || '—'}</Badge>}
              facts={[
                { label: 'Plan', value: row.plan_name },
                { label: 'Principal', value: formatGhs(row.principal_pesewas) },
                { label: 'Maturity', value: formatDeviceDate(row.maturity_date) },
              ]}
              actions={
                <div className="flex flex-col items-end gap-1">
                  <RowActions
                    name={rowName(row)}
                    actions={[{ label: 'View', href: `/admin/vlb/investments/${row.id}` }]}
                  />
                  {moneyActions(row)}
                </div>
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
              <td className="px-4 py-3">{formatDeviceDate(row.maturity_date)}</td>
              <td className="px-4 py-3"><Badge variant={payoutStatusVariant(row.renewal_choice)}>{row.renewal_choice || '—'}</Badge></td>
              <td className="px-4 py-3 text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <RowActions
                    name={rowName(row)}
                    actions={[{ label: 'View', href: `/admin/vlb/investments/${row.id}` }]}
                  />
                  {moneyActions(row)}
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
    </div>
  );
}
