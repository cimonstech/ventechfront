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
  AffiliateWithdrawalRow,
  WITHDRAWAL_STATUS_LABEL,
  affiliateStatusVariant,
  apiMessage,
  deviceRequest,
  downloadAffiliateCsv,
  formatGhs,
  formatWhen,
  nested,
} from '@/lib/affiliatesAdmin';

type Tab = 'requested' | 'processing' | 'approved' | 'paid' | 'rejected';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'requested', label: 'Requested' },
  { id: 'processing', label: 'Processing' },
  { id: 'approved', label: 'Approved' },
  { id: 'paid', label: 'Paid' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminAffiliateWithdrawalsPage() {
  useSetAdminHeading('Withdrawals');
  const { canEdit } = useAccess();
  const editable = canEdit('affiliates');
  const finance = canEdit('finance');
  const [tab, setTab] = useState<Tab>('requested');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<AffiliateWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<{ id: string; kind: 'reject' | 'paid' } | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', status: tab });
    try {
      const result = await deviceRequest<AffiliateWithdrawalRow[]>(`/api/admin/affiliates/withdrawals?${params.toString()}`);
      setRows(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load withdrawals'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab, page]);

  const run = async (id: string, body: Record<string, unknown>, fallback: string) => {
    setBusy(true);
    try {
      const result = await deviceRequest(`/api/admin/affiliates/withdrawals/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success(result.message);
      setPrompt(null);
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
        <AffiliatesNav current="/admin/affiliates/withdrawals" />
        <Button
          size="sm"
          variant="outline"
          isLoading={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              await downloadAffiliateCsv('withdrawals', new URLSearchParams({ status: tab }));
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
        <table className="min-w-[860px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-[#3A3A3A]">
            <tr>
              <th className="px-4 py-3">Affiliate</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#3A3A3A]">Loading withdrawals…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#3A3A3A]">No withdrawals in this list.</td></tr>
            ) : rows.map((row) => {
              const affiliate = nested(row.affiliate);
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {row.affiliate_id ? (
                      <Link href={`/admin/affiliates/${row.affiliate_id}`} className="font-semibold text-[#FF7A19]">
                        {affiliate?.affiliate_no || 'Affiliate'}
                      </Link>
                    ) : (affiliate?.affiliate_no || '—')}
                  </td>
                  <td className="px-4 py-3">{formatGhs(row.amount_pesewas)}</td>
                  <td className="px-4 py-3 capitalize">{row.mode?.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <Badge size="sm" variant={affiliateStatusVariant(row.status)}>
                      {WITHDRAWAL_STATUS_LABEL[row.status] || row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatWhen(row.created_at)}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {editable && row.status === 'requested' && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(row.id, { to: 'processing' }, 'Could not update this withdrawal.')}>Processing</Button>
                        <Button size="sm" disabled={busy} onClick={() => run(row.id, { to: 'approved' }, 'Could not update this withdrawal.')}>Approve</Button>
                      </>
                    )}
                    {editable && row.status === 'processing' && (
                      <Button size="sm" disabled={busy} onClick={() => run(row.id, { to: 'approved' }, 'Could not update this withdrawal.')}>Approve</Button>
                    )}
                    {finance && (row.status === 'processing' || row.status === 'approved') && (
                      <Button size="sm" disabled={busy} onClick={() => setPrompt({ id: row.id, kind: 'paid' })}>Mark paid</Button>
                    )}
                    {editable && (row.status === 'requested' || row.status === 'processing' || row.status === 'approved') && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrompt({ id: row.id, kind: 'reject' })}>Reject</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button type="button" className="text-[#FF7A19] font-semibold disabled:text-gray-400" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <span className="text-[#3A3A3A]">Page {page} of {totalPages}</span>
        <button type="button" className="text-[#FF7A19] font-semibold disabled:text-gray-400" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div>

      {prompt?.kind === 'reject' && (
        <AffiliatePrompt
          title="Reject withdrawal"
          label="Reason"
          submitLabel="Reject"
          busy={busy}
          onClose={() => setPrompt(null)}
          onSubmit={(reason) => run(prompt.id, { to: 'rejected', reason }, 'Could not reject this withdrawal.')}
        />
      )}
      {prompt?.kind === 'paid' && (
        <AffiliatePrompt
          title="Mark withdrawal paid"
          label="MoMo or bank reference"
          submitLabel="Mark paid"
          placeholder="Transaction reference"
          busy={busy}
          onClose={() => setPrompt(null)}
          onSubmit={(reference) => run(prompt.id, { to: 'paid', payment_reference: reference }, 'Could not mark this withdrawal paid.')}
        />
      )}
    </div>
  );
}
