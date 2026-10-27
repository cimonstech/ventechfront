'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AffiliatePrompt } from '@/components/admin/AffiliatePrompt';
import { AffiliatesNav } from '@/components/admin/AffiliatesNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import {
  AffiliateCommissionRow,
  COMMISSION_STATUS_LABEL,
  affiliateStatusVariant,
  apiMessage,
  commissionNotYetEligible,
  deviceRequest,
  downloadAffiliateCsv,
  formatGhs,
  formatWhen,
  nested,
} from '@/lib/affiliatesAdmin';

type Tab = 'ready' | 'pending' | 'approved' | 'reversed';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ready', label: 'Ready to verify' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'reversed', label: 'Reversed' },
];

export default function AdminAffiliateCommissionsPage() {
  useSetAdminHeading('Commissions');
  const { canEdit } = useAccess();
  const editable = canEdit('affiliates');
  const [tab, setTab] = useState<Tab>('ready');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<AffiliateCommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reverseId, setReverseId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: tab === 'pending' ? '50' : '20' });
    if (tab === 'ready') params.set('ready', 'true');
    else params.set('status', tab === 'pending' ? 'pending' : tab);
    try {
      const result = await deviceRequest<AffiliateCommissionRow[]>(`/api/admin/affiliates/commissions?${params.toString()}`);
      const list = result.data || [];
      setRows(tab === 'pending' ? list.filter(commissionNotYetEligible) : list);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load commissions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab, page]);

  const run = async (path: string, body: Record<string, unknown> | undefined, fallback: string) => {
    setBusy(true);
    try {
      const result = await deviceRequest(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      toast.success(result.message);
      setReverseId(null);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AffiliatesNav current="/admin/affiliates/commissions" />
        <Button
          size="sm"
          variant="outline"
          isLoading={exporting}
          onClick={async () => {
            setExporting(true);
            const params = new URLSearchParams();
            if (tab === 'ready') params.set('ready', 'true');
            else params.set('status', tab === 'pending' ? 'pending' : tab);
            try {
              await downloadAffiliateCsv('commissions', params);
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

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-[#3A3A3A]">
            <tr>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Eligible from</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#3A3A3A]">Loading commissions…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#3A3A3A]">No commissions in this list.</td></tr>
            ) : rows.map((row) => {
              const affiliate = nested(row.affiliate);
              const order = nested(row.order);
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {row.affiliate_id ? (
                      <Link href={`/admin/affiliates/${row.affiliate_id}`} className="font-semibold text-[#FF7A19]">
                        {affiliate?.affiliate_no || 'Affiliate'}
                      </Link>
                    ) : (affiliate?.affiliate_no || '—')}
                  </td>
                  <td className="px-4 py-3">{order?.order_number || '—'}</td>
                  <td className="px-4 py-3">{formatGhs(row.amount_pesewas)}</td>
                  <td className="px-4 py-3">
                    <Badge size="sm" variant={affiliateStatusVariant(row.status)}>
                      {COMMISSION_STATUS_LABEL[row.status] || row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatWhen(row.eligible_from)}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {editable && tab === 'ready' && (
                      <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/affiliates/commissions/${row.id}/approve`, undefined, 'Could not approve this commission.')}>
                        Approve
                      </Button>
                    )}
                    {editable && (tab === 'ready' || tab === 'approved') && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setReverseId(row.id)}>
                        Reverse
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tab !== 'pending' && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="text-[#FF7A19] font-semibold disabled:text-gray-400" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span className="text-[#3A3A3A]">Page {page} of {totalPages}</span>
          <button type="button" className="text-[#FF7A19] font-semibold disabled:text-gray-400" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      )}

      {reverseId && (
        <AffiliatePrompt
          title="Reverse commission"
          label="Reason"
          submitLabel="Reverse"
          busy={busy}
          onClose={() => setReverseId(null)}
          onSubmit={(reason) => run(`/api/admin/affiliates/commissions/${reverseId}/reverse`, { reason }, 'Could not reverse this commission.')}
        />
      )}
    </div>
  );
}
