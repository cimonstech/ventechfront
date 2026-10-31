'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InfoNote } from '@/components/ui/InfoNote';
import { AffiliatePrompt } from '@/components/admin/AffiliatePrompt';
import { AffiliatesNav } from '@/components/admin/AffiliatesNav';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { useAccess } from '@/context/AccessContext';
import { EmptyState, TableSkeleton } from '@/components/ui-states';
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
import { fetchPublicAffiliateInfo } from '@/lib/affiliates';

type Tab = 'ready' | 'pending' | 'approved' | 'reversed';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ready', label: 'Ready to verify' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'reversed', label: 'Reversed' },
];

export default function AdminAffiliateCommissionsPage() {
  const { canEdit } = useAccess();
  const editable = canEdit('affiliates');
  const [tab, setTab] = useState<Tab>('ready');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<AffiliateCommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reverseId, setReverseId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [returnWindowDays, setReturnWindowDays] = useState(7);

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
      setTotal(result.pagination?.total || 0);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load commissions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab, page]);

  useEffect(() => {
    fetchPublicAffiliateInfo()
      .then((info) => {
        if (info?.return_window_days) setReturnWindowDays(info.return_window_days);
      })
      .catch(() => undefined);
  }, []);

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

  const affiliateName = (row: AffiliateCommissionRow) => nested(row.affiliate)?.affiliate_no || 'Affiliate';
  const orderNumber = (row: AffiliateCommissionRow) => nested(row.order)?.order_number || '—';
  const count = total || rows.length;

  const rowButtons = (row: AffiliateCommissionRow) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
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
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Commissions"
        subtitle={`${count} commission${count === 1 ? '' : 's'}`}
        secondary={[
          {
            label: exporting ? 'Exporting' : 'Export all',
            disabled: exporting,
            onClick: async () => {
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
            },
          },
        ]}
      />
      <AffiliatesNav current="/admin/affiliates/commissions" />

      <InfoNote>
        Approve a commission only after the order is delivered, fully paid and the {returnWindowDays}-day return period has passed. Reverse it if the order was cancelled, refunded, returned, failed payment, was never completed, looks fraudulent, or duplicates another referral.
      </InfoNote>

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

      {loading ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No commissions in this list" description="Commissions for this status will show up here." />
      ) : (
        <>
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Affiliate</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Eligible from</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((row) => (
              <AdminRowCard
                key={row.id}
                name={affiliateName(row)}
                href={row.affiliate_id ? `/admin/affiliates/${row.affiliate_id}` : undefined}
                status={
                  <Badge size="sm" variant={affiliateStatusVariant(row.status)}>
                    {COMMISSION_STATUS_LABEL[row.status] || row.status}
                  </Badge>
                }
                facts={[
                  { label: 'Order', value: orderNumber(row) },
                  { label: 'Amount', value: formatGhs(row.amount_pesewas) },
                  { label: 'Eligible from', value: formatWhen(row.eligible_from) },
                ]}
                actions={
                  <div className="flex flex-col items-end gap-1">
                    {row.affiliate_id ? (
                      <RowActions
                        name={affiliateName(row)}
                        actions={[{ label: 'View', href: `/admin/affiliates/${row.affiliate_id}` }]}
                      />
                    ) : null}
                    {rowButtons(row)}
                  </div>
                }
              />
            ))}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {row.affiliate_id ? (
                    <Link href={`/admin/affiliates/${row.affiliate_id}`} className="font-semibold text-[#FF7A19]">
                      {affiliateName(row)}
                    </Link>
                  ) : (nested(row.affiliate)?.affiliate_no || '—')}
                </td>
                <td className="px-4 py-3">{orderNumber(row)}</td>
                <td className="px-4 py-3">{formatGhs(row.amount_pesewas)}</td>
                <td className="px-4 py-3">
                  <Badge size="sm" variant={affiliateStatusVariant(row.status)}>
                    {COMMISSION_STATUS_LABEL[row.status] || row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatWhen(row.eligible_from)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {row.affiliate_id ? (
                      <RowActions
                        name={affiliateName(row)}
                        actions={[{ label: 'View', href: `/admin/affiliates/${row.affiliate_id}` }]}
                      />
                    ) : null}
                    {rowButtons(row)}
                  </div>
                </td>
              </tr>
            ))}
          </ResponsiveTable>
          {tab !== 'pending' ? (
            <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
          ) : null}
        </>
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
