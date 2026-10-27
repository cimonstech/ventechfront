'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    deviceRequest<AffiliateMetrics>('/api/admin/affiliates/metrics')
      .then((result) => {
        if (!cancelled) setMetrics(result.data);
      })
      .catch((error) => {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load metrics'));
      });
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
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load affiliates'));
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AffiliatesNav current="/admin/affiliates" />
        <Button
          size="sm"
          variant="outline"
          isLoading={exporting}
          onClick={async () => {
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
          }}
        >
          Export CSV
        </Button>
      </div>

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
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              tab === item.id ? 'bg-[#FF7A19] text-white' : 'bg-white border border-gray-200 text-[#1A1A1A]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, email, affiliate number"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[240px]"
        />
        <button type="submit" className="px-3 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium">
          Search
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-[#3A3A3A]">
            <tr>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fee paid</th>
              <th className="px-4 py-3">Applied</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[#3A3A3A]">Loading affiliates…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[#3A3A3A]">No affiliates in this list.</td></tr>
            ) : rows.map((row) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button type="button" className="text-[#FF7A19] font-semibold disabled:text-gray-400" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <span className="text-[#3A3A3A]">Page {page} of {totalPages}</span>
        <button type="button" className="text-[#FF7A19] font-semibold disabled:text-gray-400" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div>
    </div>
  );
}
