'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import {
  AdminPageHeader,
  readyCount,
  AdminPagination,
  AdminRowCard,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { CustomerTypeBadges } from '@/components/admin/CustomerTypeBadges';
import { LoadGate, TableSkeleton } from '@/components/ui-states';
import { applyQueryFail } from '@/lib/queryState';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import {
  AFFILIATE_STATUS_LABEL,
  apiMessage,
  customerName,
  downloadCustomersCsv,
  deviceRequest,
  type CustomerCounts,
  type CustomerListRow,
  type CustomerType,
} from '@/lib/adminCustomers';

const AFFILIATE_FILTERS = ['awaiting_payment', 'pending', 'active', 'suspended', 'rejected'] as const;
const REGULAR_TAB_HINT = 'Customers who are not affiliates or Laptop Banking investors';

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#3A3A3A]">Loading customers…</p>}>
      <CustomersList />
    </Suspense>
  );
}

function CustomersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canView } = useAccess();
  useSetAdminHeading('Customers');

  const canAffiliates = canView('affiliates');
  const canVlb = canView('vlb');

  const typeParam = (searchParams.get('type') || 'all') as CustomerType;
  const type: CustomerType =
    typeParam === 'affiliate' && !canAffiliates
      ? 'all'
      : typeParam === 'investor' && !canVlb
        ? 'all'
        : typeParam === 'regular' || typeParam === 'affiliate' || typeParam === 'investor'
          ? typeParam
          : 'all';
  const affiliateStatus = type === 'affiliate' ? searchParams.get('affiliate_status') || '' : '';
  const investorStatus = type === 'investor' ? searchParams.get('investor_status') || '' : '';
  const search = searchParams.get('search') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [query, setQuery] = useState(search);
  const [rows, setRows] = useState<CustomerListRow[]>([]);
  const [counts, setCounts] = useState<CustomerCounts | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [exporting, setExporting] = useState(false);

  const replaceParams = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `/admin/users?${qs}` : '/admin/users', { scroll: false });
  };

  useEffect(() => {
    setQuery(search);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20', type, sort });
      if (search) params.set('search', search);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (type === 'affiliate' && affiliateStatus) params.set('affiliate_status', affiliateStatus);
      if (type === 'investor' && investorStatus) params.set('investor_status', investorStatus);
      try {
        const result = await deviceRequest<CustomerListRow[]>(`/api/admin/customers?${params.toString()}`);
        if (cancelled) return;
        setRows(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        if (result.counts) setCounts(result.counts);
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
      } catch (error) {
        if (!cancelled) applyQueryFail(error, { setForbidden, setFailed });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [type, affiliateStatus, investorStatus, search, from, to, sort, page]);

  const tabs = useMemo(() => {
    const items: Array<{ id: CustomerType; label: string; count: number | null }> = [
      { id: 'all', label: 'All', count: counts?.all ?? null },
      { id: 'regular', label: 'Customers only', count: counts?.regular ?? null },
    ];
    if (canAffiliates) items.push({ id: 'affiliate', label: 'Affiliates', count: counts?.affiliate ?? null });
    if (canVlb) items.push({ id: 'investor', label: 'Laptop Banking', count: counts?.investor ?? null });
    return items;
  }, [canAffiliates, canVlb, counts]);

  const filtered = Boolean(search || from || to || affiliateStatus || investorStatus);
  const emptyTitle =
    type === 'affiliate'
      ? 'No affiliates yet'
      : type === 'investor'
        ? 'No Laptop Banking investors yet'
        : 'No customers yet';
  const emptyDescription =
    type === 'affiliate'
      ? 'People who join the affiliate programme will show up here.'
      : type === 'investor'
        ? 'Investors will show up here after an application is activated.'
        : 'Customer accounts will show up here.';

  const userActions = (row: CustomerListRow) => [
    { label: 'View', href: `/admin/users/${row.id}` },
    { label: 'View orders', href: `/admin/users/${row.id}/orders` },
  ];

  const exportParams = () => {
    const params = new URLSearchParams({ type, sort });
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (type === 'affiliate' && affiliateStatus) params.set('affiliate_status', affiliateStatus);
    if (type === 'investor' && investorStatus) params.set('investor_status', investorStatus);
    return params;
  };

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Customers"
        subtitle={readyCount(loaded && !failed && counts != null, `${counts?.all ?? 0} on file`)}
        secondary={[
          {
            label: exporting ? 'Exporting' : 'Export all',
            icon: <Download size={16} />,
            onClick: async () => {
              setExporting(true);
              try {
                await downloadCustomersCsv(exportParams());
                toast.success('Export downloaded.');
              } catch (error) {
                toast.error(apiMessage(error, 'Could not export this file.'));
              } finally {
                setExporting(false);
              }
            },
          },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.id === 'regular' ? REGULAR_TAB_HINT : undefined}
            aria-label={
              item.id === 'regular'
                ? `${item.count == null ? 'Customers only' : `Customers only (${item.count})`}. ${REGULAR_TAB_HINT}`
                : undefined
            }
            onClick={() => replaceParams({ type: item.id === 'all' ? null : item.id, affiliate_status: null, investor_status: null })}
            className={`min-h-11 rounded-full px-3 py-1.5 text-sm font-medium ${
              type === item.id ? 'bg-[#FF7A19] text-white' : 'bg-white border border-gray-200 text-[#1A1A1A]'
            }`}
          >
            {item.count == null ? item.label : `${item.label} (${item.count})`}
          </button>
        ))}
      </div>

      <FilterBar
        search={query}
        onSearchChange={(value) => {
          setQuery(value);
          replaceParams({ search: value.trim() || null });
        }}
        searchPlaceholder="Search customers"
        activeCount={[from, to, sort === 'oldest' ? 'oldest' : '', affiliateStatus, investorStatus].filter(Boolean).length}
        onClear={() => replaceParams({ from: null, to: null, sort: null, affiliate_status: null, investor_status: null, search: null })}
      >
        {type === 'affiliate' ? (
          <select
            value={affiliateStatus}
            onChange={(event) => replaceParams({ affiliate_status: event.target.value || null })}
            className={filterSelectClassName()}
            aria-label="Affiliate status"
          >
            <option value="">Any affiliate status</option>
            {AFFILIATE_FILTERS.map((value) => (
              <option key={value} value={value}>{AFFILIATE_STATUS_LABEL[value]}</option>
            ))}
          </select>
        ) : null}
        {type === 'investor' ? (
          <select
            value={investorStatus}
            onChange={(event) => replaceParams({ investor_status: event.target.value || null })}
            className={filterSelectClassName()}
            aria-label="Investor status"
          >
            <option value="">Any Laptop Banking status</option>
            <option value="active">Active</option>
            <option value="past">Past</option>
          </select>
        ) : null}
        <input
          type="date"
          value={from}
          onChange={(event) => replaceParams({ from: event.target.value || null })}
          className={filterSelectClassName()}
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(event) => replaceParams({ to: event.target.value || null })}
          className={filterSelectClassName()}
          aria-label="To date"
        />
        <select
          value={sort}
          onChange={(event) => replaceParams({ sort: event.target.value === 'oldest' ? 'oldest' : null })}
          className={filterSelectClassName()}
          aria-label="Sort"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </FilterBar>
      <p className="-mt-4 mb-4 text-xs text-[#3A3A3A]">CUST customer · AFF affiliate · VLB Laptop Banking</p>

      <LoadGate
        loaded={loaded}
        loading={loading}
        updating={loading && loaded}
        error={failed}
        forbidden={forbidden}
        isEmpty={rows.length === 0}
        filtered={filtered}
        onRetry={() => replaceParams({}, false)}
        onClearFilters={() => replaceParams({ search: null, from: null, to: null, sort: null, affiliate_status: null, investor_status: null, type: type === 'all' ? null : type })}
        skeleton={<TableSkeleton rows={6} />}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        denyHome="/admin"
      >
        <>
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Newsletter</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((row) => (
              <AdminRowCard
                key={row.id}
                name={customerName(row)}
                href={`/admin/users/${row.id}`}
                status={<CustomerTypeBadges row={row} />}
                facts={[
                  { label: 'Email', value: row.email },
                  { label: 'Phone', value: row.phone || '—' },
                  { label: 'Joined', value: new Date(row.created_at).toLocaleDateString() },
                ]}
                actions={<RowActions name={customerName(row)} actions={userActions(row)} />}
              />
            ))}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                      <span className="font-semibold text-[#FF7A19]">
                        {row.first_name?.[0]}{row.last_name?.[0]}
                      </span>
                    </div>
                    <p className="truncate font-medium text-[#1A1A1A]">{customerName(row)}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#3A3A3A]">{row.email}</td>
                <td className="px-4 py-3 text-sm text-[#3A3A3A]">{row.phone || '—'}</td>
                <td className="px-4 py-3"><CustomerTypeBadges row={row} /></td>
                <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                  {new Date(row.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {row.newsletter_subscribed ? (
                    <Badge variant="success">Subscribed</Badge>
                  ) : (
                    <Badge variant="default">Not subscribed</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActions name={customerName(row)} actions={userActions(row)} />
                </td>
              </tr>
            ))}
          </ResponsiveTable>
          <AdminPagination page={page} totalPages={totalPages} onPage={(next) => replaceParams({ page: String(next) }, false)} />
        </>
      </LoadGate>
    </div>
  );
}
