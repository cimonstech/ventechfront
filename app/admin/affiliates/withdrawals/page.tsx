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
import { EmptyState, FieldError, TableSkeleton } from '@/components/ui-states';
import { AdminQueryFail } from '@/components/admin/AdminQueryFail';
import { applyQueryFail } from '@/lib/queryState';
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
  const { canEdit } = useAccess();
  const editable = canEdit('affiliates');
  const finance = canEdit('finance');
  const [tab, setTab] = useState<Tab>('requested');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<AffiliateWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [featureOff, setFeatureOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<{ id: string; kind: 'reject' | 'paid' } | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', status: tab });
    try {
      const result = await deviceRequest<AffiliateWithdrawalRow[]>(`/api/admin/affiliates/withdrawals?${params.toString()}`);
      setRows(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotal(result.pagination?.total || 0);
      setLoaded(true);
      setFailed(false);
      setForbidden(false);
      setFeatureOff(false);
    } catch (error) {
      applyQueryFail(error, { setFeatureOff, setForbidden, setFailed });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab, page]);

  const run = async (id: string, body: Record<string, unknown>, fallback: string) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await deviceRequest(`/api/admin/affiliates/withdrawals/${id}/status`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success(result.message);
      setPrompt(null);
      await load();
    } catch (error) {
      setActionError(apiMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  };

  const affiliateName = (row: AffiliateWithdrawalRow) => nested(row.affiliate)?.affiliate_no || 'Affiliate';
  const count = total || rows.length;

  const rowButtons = (row: AffiliateWithdrawalRow) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
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
          <Button size="sm" disabled={busy} onClick={() => setPrompt({ id: row.id, kind: 'paid' })}>{busy ? 'Working...' : 'Mark paid'}</Button>
      )}
      {editable && (row.status === 'requested' || row.status === 'processing' || row.status === 'approved') && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrompt({ id: row.id, kind: 'reject' })}>Reject</Button>
      )}
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Withdrawals"
        subtitle={`${count} withdrawal${count === 1 ? '' : 's'}`}
        secondary={[
          {
            label: exporting ? 'Exporting' : 'Export all',
            disabled: exporting,
            onClick: async () => {
              setExporting(true);
              try {
                await downloadAffiliateCsv('withdrawals', new URLSearchParams({ status: tab }));
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
      <AffiliatesNav current="/admin/affiliates/withdrawals" />

      {finance ? (
        <InfoNote>
          Marking a payment as paid does not send money. Send it first through MoMo or the bank, then record the reference here.
        </InfoNote>
      ) : null}

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

      {featureOff || forbidden || (failed && !loaded) ? (
        <AdminQueryFail
          featureOff={featureOff}
          forbidden={forbidden}
          failed={failed}
          loaded={loaded}
          feature="Affiliates"
          onRetry={() => void load()}
          errorTitle="We couldn't load withdrawals"
        />
      ) : loading && !loaded ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No withdrawals in this list" description="Withdrawals for this status will show up here." />
      ) : (
        <>
          {actionError ? <FieldError message={actionError} /> : null}
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Affiliate</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
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
                    {WITHDRAWAL_STATUS_LABEL[row.status] || row.status}
                  </Badge>
                }
                facts={[
                  { label: 'Amount', value: formatGhs(row.amount_pesewas) },
                  { label: 'Mode', value: row.mode?.replace('_', ' ') || '—' },
                  { label: 'Requested', value: formatWhen(row.created_at) },
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
                <td className="px-4 py-3">{formatGhs(row.amount_pesewas)}</td>
                <td className="px-4 py-3 capitalize">{row.mode?.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <Badge size="sm" variant={affiliateStatusVariant(row.status)}>
                    {WITHDRAWAL_STATUS_LABEL[row.status] || row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatWhen(row.created_at)}</td>
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
          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

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
          note={(
            <InfoNote>
              Marking a payment as paid does not send money. Send it first through MoMo or the bank, then record the reference here.
            </InfoNote>
          )}
          busy={busy}
          onClose={() => setPrompt(null)}
          onSubmit={(reference) => run(prompt.id, { to: 'paid', payment_reference: reference }, 'Could not mark this withdrawal paid.')}
        />
      )}
    </div>
  );
}
