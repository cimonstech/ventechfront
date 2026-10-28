'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AffiliatePrompt } from '@/components/admin/AffiliatePrompt';
import { AffiliatesNav } from '@/components/admin/AffiliatesNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import {
  AFFILIATE_STATUS_LABEL,
  AffiliateDetail,
  COMMISSION_STATUS_LABEL,
  WITHDRAWAL_STATUS_LABEL,
  affiliateStatusVariant,
  apiMessage,
  deviceRequest,
  formatGhs,
  formatWhen,
  maskTail,
} from '@/lib/affiliatesAdmin';

type PromptKind = 'reject' | 'suspend' | 'refund' | 'reverse' | 'paid' | 'reject-withdrawal';

export default function AdminAffiliateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { canEdit } = useAccess();
  const editable = canEdit('affiliates');
  const finance = canEdit('finance');
  const [detail, setDetail] = useState<AffiliateDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<{ kind: PromptKind; targetId?: string } | null>(null);

  const title = detail?.profile.affiliate_no || detail?.profile.user?.name || 'Affiliate';
  useSetAdminHeading(title, id || null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const result = await deviceRequest<AffiliateDetail>(`/api/admin/affiliates/${id}`);
      setDetail(result.data);
      setFailed(false);
    } catch (error) {
      setFailed(true);
      toast.error(apiMessage(error, 'Could not load this affiliate'));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (path: string, body: Record<string, unknown> | undefined, fallback: string) => {
    setBusy(true);
    try {
      const result = await deviceRequest(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
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

  if (failed && !detail) {
    return (
      <div className="space-y-4">
        <AffiliatesNav current="/admin/affiliates" />
        <p className="text-sm text-[#3A3A3A]">Could not load this affiliate.</p>
      </div>
    );
  }

  if (!detail) {
    return <p className="text-sm text-[#3A3A3A]">Loading affiliate…</p>;
  }

  const { profile, fee, clicks, orders, commissions, ledger, withdrawals } = detail;
  const payout = profile.payout || {};
  const showPayout = finance;
  const feeLabel = fee.refunded_at ? 'Refunded' : fee.refund_due ? 'Refund due' : fee.paid_at ? 'Paid' : 'Unpaid';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AffiliatesNav current="/admin/affiliates" />
        <Link href="/admin/affiliates" className="text-sm font-medium text-[#FF7A19]">Back to affiliates</Link>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">{profile.user?.name || 'Applicant'}</h2>
            <p className="text-sm text-[#3A3A3A]">{profile.user?.email || '—'} {profile.user?.phone ? `· ${profile.user.phone}` : ''}</p>
          </div>
          <Badge variant={affiliateStatusVariant(profile.status)}>
            {AFFILIATE_STATUS_LABEL[profile.status] || profile.status}
          </Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <p><span className="text-[#3A3A3A]">Number: </span>{profile.affiliate_no || '—'}</p>
          <p><span className="text-[#3A3A3A]">Code: </span>{profile.referral_code || '—'}</p>
          <p><span className="text-[#3A3A3A]">Withdrawal mode: </span>{profile.withdrawal_mode?.replace('_', ' ') || '—'}</p>
          <p><span className="text-[#3A3A3A]">Applied: </span>{formatWhen(profile.created_at)}</p>
          {profile.links?.general ? (
            <p className="sm:col-span-2 break-all"><span className="text-[#3A3A3A]">Link: </span>{profile.links.general}</p>
          ) : null}
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2 pt-2">
            {(profile.status === 'pending' || profile.status === 'rejected') && (
              <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/affiliates/${id}/approve`, undefined, 'Could not approve this affiliate.')}>Approve</Button>
            )}
            {(profile.status === 'pending' || profile.status === 'awaiting_payment') && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrompt({ kind: 'reject' })}>Reject</Button>
            )}
            {profile.status === 'active' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrompt({ kind: 'suspend' })}>Suspend</Button>
            )}
            {profile.status === 'suspended' && (
              <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/affiliates/${id}/reactivate`, undefined, 'Could not reactivate this affiliate.')}>Reactivate</Button>
            )}
          </div>
        )}
        {profile.rejected_reason ? <p className="text-sm text-[#3A3A3A]">Rejected: {profile.rejected_reason}</p> : null}
        {profile.suspended_reason ? <p className="text-sm text-[#3A3A3A]">Suspended: {profile.suspended_reason}</p> : null}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
          <h3 className="font-semibold text-[#1A1A1A]">Fee</h3>
          <p><span className="text-[#3A3A3A]">Status: </span>{feeLabel}</p>
          <p><span className="text-[#3A3A3A]">Amount: </span>{fee.amount_pesewas != null ? formatGhs(fee.amount_pesewas) : '—'}</p>
          <p><span className="text-[#3A3A3A]">Paid: </span>{formatWhen(fee.paid_at)}</p>
          <p><span className="text-[#3A3A3A]">Paystack reference: </span>{fee.reference || '—'}</p>
          {fee.refunded_at ? (
            <p><span className="text-[#3A3A3A]">Refunded: </span>{formatWhen(fee.refunded_at)} · {fee.refund_reference || '—'}</p>
          ) : null}
          {finance && fee.refund_due && (
            <Button size="sm" disabled={busy} onClick={() => setPrompt({ kind: 'refund' })}>Record fee refund</Button>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
          <h3 className="font-semibold text-[#1A1A1A]">Payout details</h3>
          <p><span className="text-[#3A3A3A]">Method: </span>{payout.payout_method || '—'}</p>
          {payout.payout_method === 'momo' ? (
            <>
              <p><span className="text-[#3A3A3A]">Network: </span>{payout.momo_network || '—'}</p>
              <p><span className="text-[#3A3A3A]">Number: </span>{showPayout ? (payout.momo_number || '—') : maskTail(payout.momo_number)}</p>
            </>
          ) : (
            <>
              <p><span className="text-[#3A3A3A]">Bank: </span>{payout.bank_name || '—'}</p>
              <p><span className="text-[#3A3A3A]">Account name: </span>{payout.bank_account_name || '—'}</p>
              <p><span className="text-[#3A3A3A]">Account number: </span>{showPayout ? (payout.bank_account_number || '—') : maskTail(payout.bank_account_number)}</p>
            </>
          )}
          {!showPayout ? <p className="text-xs text-[#3A3A3A]">Full numbers are visible to finance staff only.</p> : null}
        </section>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
        <h3 className="font-semibold text-[#1A1A1A]">Clicks and orders</h3>
        <p>{clicks.total} clicks{clicks.last_at ? ` · last ${formatWhen(clicks.last_at)}` : ''}</p>
        {orders.length === 0 ? (
          <p className="text-[#3A3A3A]">No attributed orders.</p>
        ) : (
          <div className="overflow-x-auto sticky-first">
            <table className="min-w-[560px] w-full text-sm">
              <thead className="text-left text-[#3A3A3A]">
                <tr>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Payment</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-2 pr-3">{order.order_number}</td>
                    <td className="py-2 pr-3">GH? {Number(order.total).toFixed(2)}</td>
                    <td className="py-2 pr-3 capitalize">{order.status}</td>
                    <td className="py-2 pr-3 capitalize">{order.payment_status}</td>
                    <td className="py-2 whitespace-nowrap">{formatWhen(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
        <h3 className="font-semibold text-[#1A1A1A]">Commissions</h3>
        {commissions.length === 0 ? <p className="text-[#3A3A3A]">No commissions.</p> : (
          <div className="overflow-x-auto sticky-first">
            <table className="min-w-[640px] w-full">
              <thead className="text-left text-[#3A3A3A]">
                <tr>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Eligible from</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3">{formatGhs(row.amount_pesewas)}</td>
                    <td className="py-2 pr-3">
                      <Badge size="sm" variant={affiliateStatusVariant(row.status)}>{COMMISSION_STATUS_LABEL[row.status] || row.status}</Badge>
                    </td>
                    <td className="py-2 pr-3">{formatWhen(row.eligible_from)}</td>
                    <td className="py-2 text-right space-x-2 whitespace-nowrap">
                      {editable && row.status === 'pending' && row.eligible_from && new Date(row.eligible_from).getTime() <= Date.now() && (
                        <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/affiliates/commissions/${row.id}/approve`, undefined, 'Could not approve this commission.')}>Approve</Button>
                      )}
                      {editable && (row.status === 'pending' || row.status === 'approved') && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrompt({ kind: 'reverse', targetId: row.id })}>Reverse</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
        <h3 className="font-semibold text-[#1A1A1A]">Ledger</h3>
        {ledger.length === 0 ? <p className="text-[#3A3A3A]">No ledger lines.</p> : (
          <div className="overflow-x-auto sticky-first">
            <table className="min-w-[560px] w-full">
              <thead className="text-left text-[#3A3A3A]">
                <tr>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Note</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledger.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3">{row.type.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3">{formatGhs(row.amount_pesewas)}</td>
                    <td className="py-2 pr-3">{row.note || '—'}</td>
                    <td className="py-2 whitespace-nowrap">{formatWhen(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
        <h3 className="font-semibold text-[#1A1A1A]">Withdrawals</h3>
        {withdrawals.length === 0 ? <p className="text-[#3A3A3A]">No withdrawals.</p> : (
          <div className="overflow-x-auto sticky-first">
            <table className="min-w-[640px] w-full">
              <thead className="text-left text-[#3A3A3A]">
                <tr>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Requested</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {withdrawals.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3">{formatGhs(row.amount_pesewas)}</td>
                    <td className="py-2 pr-3">
                      <Badge size="sm" variant={affiliateStatusVariant(row.status)}>{WITHDRAWAL_STATUS_LABEL[row.status] || row.status}</Badge>
                    </td>
                    <td className="py-2 pr-3">{formatWhen(row.created_at)}</td>
                    <td className="py-2 text-right space-x-2 whitespace-nowrap">
                      {editable && row.status === 'requested' && (
                        <>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(`/api/admin/affiliates/withdrawals/${row.id}/status`, { to: 'processing' }, 'Could not update this withdrawal.')}>Processing</Button>
                          <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/affiliates/withdrawals/${row.id}/status`, { to: 'approved' }, 'Could not update this withdrawal.')}>Approve</Button>
                        </>
                      )}
                      {editable && row.status === 'processing' && (
                        <Button size="sm" disabled={busy} onClick={() => run(`/api/admin/affiliates/withdrawals/${row.id}/status`, { to: 'approved' }, 'Could not update this withdrawal.')}>Approve</Button>
                      )}
                      {finance && (row.status === 'processing' || row.status === 'approved') && (
                        <Button size="sm" disabled={busy} onClick={() => setPrompt({ kind: 'paid', targetId: row.id })}>Mark paid</Button>
                      )}
                      {editable && (row.status === 'requested' || row.status === 'processing' || row.status === 'approved') && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrompt({ kind: 'reject-withdrawal', targetId: row.id })}>Reject</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {prompt?.kind === 'reject' && (
        <AffiliatePrompt title="Reject application" label="Reason" submitLabel="Reject" busy={busy} onClose={() => setPrompt(null)} onSubmit={(reason) => run(`/api/admin/affiliates/${id}/reject`, { reason }, 'Could not reject this affiliate.')} />
      )}
      {prompt?.kind === 'suspend' && (
        <AffiliatePrompt title="Suspend affiliate" label="Reason" submitLabel="Suspend" busy={busy} onClose={() => setPrompt(null)} onSubmit={(reason) => run(`/api/admin/affiliates/${id}/suspend`, { reason }, 'Could not suspend this affiliate.')} />
      )}
      {prompt?.kind === 'refund' && (
        <AffiliatePrompt title="Record fee refund" label="Paystack refund reference" submitLabel="Save" busy={busy} onClose={() => setPrompt(null)} onSubmit={(reference) => run(`/api/admin/affiliates/${id}/fee-refunded`, { reference }, 'Could not record this refund.')} />
      )}
      {prompt?.kind === 'reverse' && prompt.targetId && (
        <AffiliatePrompt title="Reverse commission" label="Reason" submitLabel="Reverse" busy={busy} onClose={() => setPrompt(null)} onSubmit={(reason) => run(`/api/admin/affiliates/commissions/${prompt.targetId}/reverse`, { reason }, 'Could not reverse this commission.')} />
      )}
      {prompt?.kind === 'paid' && prompt.targetId && (
        <AffiliatePrompt title="Mark withdrawal paid" label="MoMo or bank reference" submitLabel="Mark paid" busy={busy} onClose={() => setPrompt(null)} onSubmit={(reference) => run(`/api/admin/affiliates/withdrawals/${prompt.targetId}/status`, { to: 'paid', payment_reference: reference }, 'Could not mark this withdrawal paid.')} />
      )}
      {prompt?.kind === 'reject-withdrawal' && prompt.targetId && (
        <AffiliatePrompt title="Reject withdrawal" label="Reason" submitLabel="Reject" busy={busy} onClose={() => setPrompt(null)} onSubmit={(reason) => run(`/api/admin/affiliates/withdrawals/${prompt.targetId}/status`, { to: 'rejected', reason }, 'Could not reject this withdrawal.')} />
      )}
    </div>
  );
}
