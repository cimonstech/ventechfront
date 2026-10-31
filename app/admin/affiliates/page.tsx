'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, NoResults, TableSkeleton } from '@/components/ui-states';
import { AdminQueryFail } from '@/components/admin/AdminQueryFail';
import { applyQueryFail } from '@/lib/queryState';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  FilterBar,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { AffiliatesNav } from '@/components/admin/AffiliatesNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import {
  AFFILIATE_STATUS_LABEL,
  AffiliateListRow,
  AffiliateMetrics,
  affiliateStatusVariant,
  apiMessage,
  deviceRequest,
  downloadAffiliateCsv,
  formatGhs,
  formatWhen,
} from '@/lib/affiliatesAdmin';

type Tab = 'pending' | 'active' | 'suspended' | 'rejected';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'pending', label: 'Applications' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminAffiliatesPage() {
  useSetAdminHeading('Affiliates');
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<AffiliateListRow[]>([]);
  const [metrics, setMetrics] = useState<AffiliateMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [featureOff, setFeatureOff] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    deviceRequest<AffiliateMetrics>('/api/admin/affiliates/metrics')
      .then((result) => {
        if (!cancelled) setMetrics(result.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20', status: tab });
      if (query) params.set('search', query);
      try {
        const result = await deviceRequest<AffiliateListRow[]>(`/api/admin/affiliates?${params.toString()}`);
        if (cancelled) return;
        setRows(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
        setFeatureOff(false);
      } catch (error) {
        if (!cancelled) {
          applyQueryFail(error, { setFeatureOff, setForbidden, setFailed });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab, page, query]);

  const cards = [
    { label: 'Total affiliates', value: metrics?.total_affiliates ?? '—' },
    { label: 'Active', value: metrics?.active_affiliates ?? '—' },
    { label: 'Fees paid', value: metrics ? formatGhs(metrics.total_fees_paid_pesewas) : '—' },
    { label: 'Link clicks', value: metrics?.link_clicks ?? '—' },
    { label: 'Referred customers', value: metrics?.referred_customers ?? '—' },
    { label: 'Affiliate sales', value: metrics?.affiliate_sales ?? '—' },
    { label: 'Commissions', value: metrics ? formatGhs(metrics.total_commissions_pesewas) : '—' },
    { label: 'Pending commissions', value: metrics ? formatGhs(metrics.pending_pesewas) : '—' },
    { label: 'Paid out', value: metrics ? formatGhs(metrics.paid_pesewas) : '—' },
    { label: 'Open withdrawals', value: metrics?.open_withdrawal_requests ?? '—' },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Affiliates"
        subtitle={metrics ? `${metrics.total_affiliates} affiliates` : undefined}
        secondary={[
          {
            label: exporting ? 'Exporting' : 'Export all',
            onClick: async () => {
              setExporting(true);
              const params = new URLSearchParams({ status: tab });
              if (query) params.set('search', query);
              try {
                await downloadAffiliateCsv('affiliates', params);
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
      <AffiliatesNav current="/admin/affiliates" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-[#3A3A3A]">{card.label}</p>
            <p className="text-xl font-bold text-[#1A1A1A] mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
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
        searchPlaceholder="Search affiliates"
      />

      {featureOff || forbidden || (failed && !loaded) ? (
        <AdminQueryFail
          featureOff={featureOff}
          forbidden={forbidden}
          failed={failed}
          loaded={loaded}
          feature="Affiliates"
          onRetry={() => setPage(1)}
          errorTitle="We couldn't load affiliates"
        />
      ) : loading && !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 && query ? (
        <NoResults primary={{ label: 'Clear filters', onClick: () => { setQuery(''); setSearch(''); }} } />
      ) : rows.length === 0 ? (
        <EmptyState title="No affiliates in this list yet" description="Applications and accounts for this status will show up here." />
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fee paid</th>
              <th className="px-4 py-3">Applied</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={rows.map((row) => (
            <AdminRowCard
              key={row.id}
              name={row.affiliate_no || row.user?.name || 'Application'}
              href={`/admin/affiliates/${row.id}`}
              status={
                <Badge size="sm" variant={affiliateStatusVariant(row.status)}>
                  {AFFILIATE_STATUS_LABEL[row.status] || row.status}
                </Badge>
              }
              facts={[
                { label: 'Person', value: row.user?.name || '—' },
                { label: 'Fee paid', value: row.fee_paid_at ? formatWhen(row.fee_paid_at) : '—' },
                { label: 'Applied', value: formatWhen(row.created_at) },
              ]}
              actions={
                <RowActions
                  name={row.affiliate_no || row.user?.name || 'affiliate'}
                  actions={[{ label: 'View', href: `/admin/affiliates/${row.id}` }]}
                />
              }
            />
          ))}
        >
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link href={`/admin/affiliates/${row.id}`} className="font-semibold text-[#FF7A19]">
                  {row.affiliate_no || 'Application'}
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="text-[#1A1A1A]">{row.user?.name || '—'}</p>
                <p className="text-xs text-[#3A3A3A]">{row.user?.email || ''}</p>
              </td>
              <td className="px-4 py-3">
                <Badge size="sm" variant={affiliateStatusVariant(row.status)}>
                  {AFFILIATE_STATUS_LABEL[row.status] || row.status}
                </Badge>
              </td>
              <td className="px-4 py-3">{row.fee_paid_at ? formatWhen(row.fee_paid_at) : '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatWhen(row.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <RowActions
                  name={row.affiliate_no || row.user?.name || 'affiliate'}
                  actions={[{ label: 'View', href: `/admin/affiliates/${row.id}` }]}
                />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
