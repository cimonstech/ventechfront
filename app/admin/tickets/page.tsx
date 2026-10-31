'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { LoadGate, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAppSelector } from '@/store';
import {
  TicketAssignee,
  TicketIssueType,
  TicketListItem,
  TicketSummary,
  apiMessage,
  deviceRequest,
  formatTicketWhen,
  statusVariant,
  STATUS_LABEL,
  TICKET_STAGES,
} from '@/lib/ticketsAdmin';

type Tab = 'open' | 'mine' | 'unassigned' | 'done';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'mine', label: 'My tickets' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'done', label: 'Completed and closed' },
];

export default function ServiceRequestsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#3A3A3A]">Loading requests…</p>}>
      <ServiceRequestsList />
    </Suspense>
  );
}

function ServiceRequestsList() {
  const searchParams = useSearchParams();
  const userId = useAppSelector((state) => state.auth.user?.id);
  useSetAdminHeading('Service requests');

  const [tab, setTab] = useState<Tab>('open');
  const [summary, setSummary] = useState<TicketSummary | null>(null);
  const [rows, setRows] = useState<TicketListItem[]>([]);
  const [assignees, setAssignees] = useState<TicketAssignee[]>([]);
  const [issues, setIssues] = useState<TicketIssueType[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [issueTypeId, setIssueTypeId] = useState('');
  const [warranty, setWarranty] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      try {
        const [summaryResult, assigneeResult, issueResult] = await Promise.all([
          deviceRequest<TicketSummary>('/api/admin/tickets/summary'),
          deviceRequest<TicketAssignee[]>('/api/admin/tickets/assignees'),
          deviceRequest<TicketIssueType[]>('/api/admin/tickets/issue-types'),
        ]);
        if (cancelled) return;
        setSummary(summaryResult.data);
        setAssignees(assigneeResult.data || []);
        setIssues(issueResult.data || []);
      } catch {
        /* filters stay empty; the list load reports its own error */
      }
    };
    void loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (tab === 'mine' && !userId) return;
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (query) params.set('search', query);
      if (issueTypeId) params.set('issue_type_id', issueTypeId);
      if (warranty) params.set('warranty_status', warranty);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (tab === 'mine' && userId) params.set('assigned_to', userId);
      else if (tab === 'unassigned') params.set('assigned_to', 'unassigned');
      else if (assigneeFilter) params.set('assigned_to', assigneeFilter);
      if (status) params.set('status', status);
      else if (tab === 'open') params.set('status', 'open');
      else if (tab === 'done') params.set('status', 'done');
      try {
        const result = await deviceRequest<TicketListItem[]>(`/api/admin/tickets?${params.toString()}`);
        if (cancelled) return;
        setRows(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
      } catch (error) {
        if (!cancelled) {
          const kind = noteQueryFail(error);
          if (kind === 'forbidden') setForbidden(true);
          else if (kind !== 'unauthorized') setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, page, query, issueTypeId, warranty, from, to, status, assigneeFilter, userId]);

  const assigneeName = (row: { assigned_to: string | null; assignee_name?: string | null }) => {
    if (row.assignee_name) return row.assignee_name;
    if (!row.assigned_to) return 'Unassigned';
    return assignees.find((person) => person.id === row.assigned_to)?.name || 'Assigned';
  };

  const openCounts = TICKET_STAGES.filter((item) => item !== 'completed').map((item) => ({
    label: STATUS_LABEL[item],
    count: summary?.counts[item] || 0,
  }));

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Service requests"
        subtitle={`${rows.length} on this page`}
        secondary={[{ label: 'Issue types', href: '/admin/tickets/issue-types' }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {openCounts.map((item) => (
          <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-[#3A3A3A]">{item.label}</p>
            <p className="text-2xl font-bold text-[#1A1A1A]">{item.count}</p>
          </div>
        ))}
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-[#3A3A3A]">Older than 7 days</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">{summary?.open_older_than_7_days ?? '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-[#3A3A3A]">Avg days to complete</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {summary?.average_days_to_complete_90 ?? '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setStatus('');
              setPage(1);
            }}
            className={`min-h-11 rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === item.id ? 'bg-[#FF7A19] text-white' : 'bg-white border border-gray-200 text-[#1A1A1A]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setQuery(value.trim());
          setPage(1);
        }}
        searchPlaceholder="Ticket, serial, phone, email"
        activeCount={[issueTypeId, warranty, from, to, status, assigneeFilter].filter(Boolean).length}
        onClear={() => {
          setIssueTypeId('');
          setWarranty('');
          setFrom('');
          setTo('');
          setStatus('');
          setAssigneeFilter('');
          setPage(1);
        }}
      >
        <select
          value={issueTypeId}
          onChange={(event) => { setIssueTypeId(event.target.value); setPage(1); }}
          className={filterSelectClassName()}
        >
          <option value="">All issues</option>
          {issues.map((issue) => (
            <option key={issue.id} value={issue.id}>{issue.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          className={filterSelectClassName()}
        >
          <option value="">Status from tab</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {(tab === 'open' || tab === 'done') ? (
          <select
            value={assigneeFilter}
            onChange={(event) => { setAssigneeFilter(event.target.value); setPage(1); }}
            className={filterSelectClassName()}
          >
            <option value="">Any assignee</option>
            <option value="unassigned">Unassigned</option>
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>{person.name || person.email}</option>
            ))}
          </select>
        ) : null}
        <select
          value={warranty}
          onChange={(event) => { setWarranty(event.target.value); setPage(1); }}
          className={filterSelectClassName()}
        >
          <option value="">Any warranty</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="none">None</option>
          <option value="unknown">Unknown</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(event) => { setFrom(event.target.value); setPage(1); }}
          className={filterSelectClassName()}
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(event) => { setTo(event.target.value); setPage(1); }}
          className={filterSelectClassName()}
          aria-label="To date"
        />
      </FilterBar>

      <LoadGate
        loaded={loaded}
        loading={loading}
        updating={loading && loaded}
        error={failed}
        forbidden={forbidden}
        isEmpty={rows.length === 0}
        filtered={Boolean(query || issueTypeId || warranty || from || to || status || assigneeFilter)}
        onRetry={() => setPage(1)}
        onClearFilters={() => {
          setQuery('');
          setSearch('');
          setIssueTypeId('');
          setWarranty('');
          setFrom('');
          setTo('');
          setStatus('');
          setAssigneeFilter('');
        }}
        skeleton={<TableSkeleton rows={6} />}
        emptyTitle="No service requests yet"
        emptyDescription="Customer requests will show up here."
        denyHome="/admin"
      >
        <>
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Warranty</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((row) => (
              <AdminRowCard
                key={row.id}
                name={row.ticket_no}
                href={`/admin/tickets/${row.id}`}
                status={
                  <Badge size="sm" variant={statusVariant(row.status)}>
                    {STATUS_LABEL[row.status] || row.status}
                  </Badge>
                }
                facts={[
                  { label: 'Customer', value: row.customer?.name || '—' },
                  { label: 'Model', value: row.laptop_model },
                  { label: 'Assignee', value: assigneeName(row) },
                  { label: 'Date', value: formatTicketWhen(row.updated_at) },
                ]}
                actions={
                  <RowActions
                    name={row.ticket_no}
                    actions={[{ label: 'View', href: `/admin/tickets/${row.id}` }]}
                  />
                }
              />
            ))}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/tickets/${row.id}`} className="font-semibold text-[#FF7A19]">{row.ticket_no}</Link>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[#1A1A1A]">{row.customer?.name || '—'}</p>
                  <p className="text-xs text-[#3A3A3A]">{row.customer?.email || ''}</p>
                </td>
                <td className="px-4 py-3 text-[#1A1A1A]">{row.laptop_model}</td>
                <td className="px-4 py-3">{row.issue?.name || '—'}</td>
                <td className="px-4 py-3">
                  <Badge size="sm" variant={statusVariant(row.status)}>{STATUS_LABEL[row.status] || row.status}</Badge>
                </td>
                <td className="px-4 py-3">{assigneeName(row)}</td>
                <td className="px-4 py-3 capitalize">{row.warranty_status_at_submit || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatTicketWhen(row.updated_at)}</td>
                <td className="px-4 py-3 text-right">
                  <RowActions
                    name={row.ticket_no}
                    actions={[{ label: 'View', href: `/admin/tickets/${row.id}` }]}
                  />
                </td>
              </tr>
            ))}
          </ResponsiveTable>

          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      </LoadGate>
    </div>
  );
}
