'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { TicketIssueType, apiMessage, deviceRequest } from '@/lib/ticketsAdmin';

export default function IssueTypesPage() {
  const { canEdit } = useAccess();
  const editable = canEdit('tickets');
  useSetAdminHeading('Issue types');
  const [rows, setRows] = useState<TicketIssueType[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await deviceRequest<TicketIssueType[]>('/api/admin/tickets/issue-types');
      setRows(result.data || []);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load issue types'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addType = async () => {
    if (!name.trim()) {
      toast.error('Enter an issue type name.');
      return;
    }
    setWorking(true);
    try {
      const result = await deviceRequest('/api/admin/tickets/issue-types', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), sort_order: rows.length + 1, is_active: true }),
      });
      toast.success(result.message);
      setName('');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the issue type'));
    } finally {
      setWorking(false);
    }
  };

  const saveRow = async (row: TicketIssueType, patch: Partial<TicketIssueType>) => {
    setWorking(true);
    try {
      const result = await deviceRequest(`/api/admin/tickets/issue-types/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      toast.success(result.message);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the issue type'));
    } finally {
      setWorking(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setWorking(true);
    try {
      await Promise.all(next.map((row, order) => {
        const sortOrder = order + 1;
        if (row.sort_order === sortOrder) return Promise.resolve();
        return deviceRequest(`/api/admin/tickets/issue-types/${row.id}`, {
          method: 'PUT',
          body: JSON.stringify({ sort_order: sortOrder }),
        });
      }));
      toast.success('Issue type saved.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the issue type'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin/tickets" className="text-sm font-medium text-[#FF7A19]">Back to service requests</Link>
      <h2 className="text-lg font-bold text-[#1A1A1A]">Issue types</h2>
      {editable && (
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void addType(); }}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New issue type"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <Button type="submit" isLoading={working}>Add</Button>
        </form>
      )}
      {loading ? (
        <p className="text-sm text-[#3A3A3A]">Loading issue types…</p>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y">
          {rows.map((row, index) => (
            <IssueRow
              key={row.id}
              row={row}
              editable={editable}
              working={working}
              first={index === 0}
              last={index === rows.length - 1}
              onSave={saveRow}
              onMove={(direction) => move(index, direction)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueRow({
  row,
  editable,
  working,
  first,
  last,
  onSave,
  onMove,
}: {
  row: TicketIssueType;
  editable: boolean;
  working: boolean;
  first: boolean;
  last: boolean;
  onSave: (row: TicketIssueType, patch: Partial<TicketIssueType>) => Promise<void>;
  onMove: (direction: -1 | 1) => void;
}) {
  const [name, setName] = useState(row.name);
  useEffect(() => setName(row.name), [row.name]);
  return (
    <li className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      {editable ? (
        <input value={name} onChange={(event) => setName(event.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      ) : (
        <p className="flex-1 text-sm font-medium text-[#1A1A1A]">{row.name}</p>
      )}
      <p className={`text-xs font-semibold ${row.is_active === false ? 'text-gray-400' : 'text-green-700'}`}>
        {row.is_active === false ? 'Inactive' : 'Active'}
      </p>
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={working || name.trim() === row.name || !name.trim()} onClick={() => onSave(row, { name: name.trim() })}>Rename</Button>
          <Button type="button" size="sm" variant="ghost" disabled={working || first} onClick={() => onMove(-1)}>Up</Button>
          <Button type="button" size="sm" variant="ghost" disabled={working || last} onClick={() => onMove(1)}>Down</Button>
          <Button type="button" size="sm" variant="secondary" disabled={working} onClick={() => onSave(row, { is_active: row.is_active === false })}>
            {row.is_active === false ? 'Activate' : 'Deactivate'}
          </Button>
        </div>
      )}
    </li>
  );
}
