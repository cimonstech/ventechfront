'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InfoNote, InfoTip } from '@/components/ui/InfoNote';
import { Sheet } from '@/components/ui/Sheet';
import { useAccess } from '@/context/AccessContext';
import { hasActiveInvestorRole } from '@/lib/account';
import { settingsService } from '@/lib/settings.service';
import {
  apiMessage,
  downloadAuthFile,
  VLB_EARLY_EXIT_ALLOWED,
  formatDeviceDate,
  formatGhs,
  openSignedVlbDocument,
  payoutStatusVariant,
  scholarFundCopy,
  vlbGhs,
  vlbRequest,
  type VlbDocument,
  type VlbMe,
  type VlbPublicPlan,
} from '@/lib/vlb';

const FALLBACK_PHONE = '+233 55 134 4310';

function whatsappHref(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function telHref(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? `tel:+${digits.startsWith('0') ? `233${digits.slice(1)}` : digits}` : '';
}

export default function AccountInvestmentsPage() {
  const { access } = useAccess();
  const allowed = hasActiveInvestorRole(access?.programRoles);
  const [me, setMe] = useState<VlbMe | null>(null);
  const [docs, setDocs] = useState<VlbDocument[]>([]);
  const [plans, setPlans] = useState<VlbPublicPlan[]>([]);
  const [failed, setFailed] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [planId, setPlanId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [phone, setPhone] = useState(FALLBACK_PHONE);
  const [whatsapp, setWhatsapp] = useState('');

  const load = async () => {
    const [mine, documents] = await Promise.all([
      vlbRequest<VlbMe>('/api/vlb/me'),
      vlbRequest<VlbDocument[]>('/api/vlb/me/documents'),
    ]);
    setMe(mine.data);
    setDocs(documents.data || []);
  };

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    load()
      .then(() => {
        if (!cancelled) setFailed(false);
      })
      .catch((error) => {
        if (!cancelled) {
          setFailed(true);
          toast.error(apiMessage(error, 'Could not load your investments'));
        }
      });
    const timer = window.setInterval(() => {
      if (cancelled || !allowed) return;
      load().catch(() => undefined);
    }, 90 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [allowed]);

  useEffect(() => {
    let cancelled = false;
    settingsService.getSettingsByCategory('store')
      .then((settings) => {
        if (cancelled) return;
        if (settings.store_phone) setPhone(settings.store_phone);
        if (settings.store_whatsapp_number) setWhatsapp(settings.store_whatsapp_number);
      })
      .catch((error) => console.error('store contact', error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!upgradeOpen) return;
    vlbRequest<VlbPublicPlan[]>('/api/vlb/plans')
      .then((result) => setPlans(result.data || []))
      .catch((error) => toast.error(apiMessage(error, 'Could not load plans')));
  }, [upgradeOpen]);

  if (!allowed) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Investments</h1>
        <p className="mt-2 text-sm text-[#3A3A3A]">This section is for active Laptop Banking investors.</p>
      </div>
    );
  }

  if (!me) {
    return <p className="text-sm text-[#3A3A3A]">{failed ? 'Could not load your investments.' : 'Loading your investments…'}</p>;
  }

  const payout = me.payout;
  const summary = me.summary;
  const featured = summary?.featured;
  const horizon = featured?.horizon_progress;
  const horizonPct = horizon?.days_total
    ? Math.min(100, Math.round((horizon.days_elapsed / horizon.days_total) * 100))
    : 0;
  const wa = whatsappHref(whatsapp);
  const call = telHref(phone);
  const scholarSource = me.investments.find((row) => row.id === featured?.investment_id) || me.investments[0];
  const scholarCopy = scholarFundCopy(scholarSource?.scholar_fund_percent, scholarSource?.scholar_fund_basis);

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold text-[#1A1A1A] md:text-2xl">Laptop Banking</h1>
        <p className="mt-1 text-sm text-[#3A3A3A]">{me.investor_no || 'Your investments'}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[#3A3A3A]">Total invested</dt>
            <dd className="font-semibold text-[#1A1A1A]">{formatGhs(summary?.total_invested_pesewas || 0)}</dd>
          </div>
          <div>
            <dt className="text-[#3A3A3A]">Next payout</dt>
            <dd className="font-semibold text-[#1A1A1A]">
              {summary?.next_payout
                ? `${formatDeviceDate(summary.next_payout.date)} · ${formatGhs(summary.next_payout.net_pesewas)}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[#3A3A3A]">Received so far</dt>
            <dd className="font-semibold text-[#1A1A1A]">{formatGhs(summary?.received_pesewas || 0)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[#3A3A3A]">
              Scholar Fund
              <InfoTip text={scholarCopy} label="About the Scholar Fund">
                <Info className="h-3.5 w-3.5" aria-hidden />
              </InfoTip>
            </dt>
            <dd className="font-semibold text-[#1A1A1A]">{formatGhs(summary?.scholar_fund_pesewas || 0)}</dd>
          </div>
        </dl>
        {featured && (
          <div className="mt-4">
            <p className="text-sm text-[#3A3A3A]">
              {featured.horizon_months}-month progress · {featured.plan_name}
            </p>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-[#FF7A19]" style={{ width: `${horizonPct}%` }} />
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={!featured || downloading}
            isLoading={downloading}
            onClick={async () => {
              if (!featured) return;
              setDownloading(true);
              try {
                await downloadAuthFile(
                  `/api/vlb/me/investments/${featured.investment_id}/statement.pdf`,
                  `vlb-statement-${me.investor_no || 'investment'}.pdf`
                );
              } catch (error) {
                toast.error(apiMessage(error, 'Could not download this statement.'));
              } finally {
                setDownloading(false);
              }
            }}
          >
            Download statement
          </Button>
          <Button size="sm" className="min-h-11" onClick={() => setUpgradeOpen(true)}>Upgrade</Button>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-[#FF7A19] px-3 text-sm font-medium text-[#FF7A19]"
            >
              WhatsApp
            </a>
          ) : null}
          {call ? (
            <a
              href={call}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-[#FF7A19] px-3 text-sm font-medium text-[#FF7A19]"
            >
              Call VENTECH
            </a>
          ) : null}
        </div>
        {!VLB_EARLY_EXIT_ALLOWED ? (
          <p className="mt-3 text-xs text-[#3A3A3A]">
            Investments run for the full 10-month cycle and cannot be withdrawn early.
          </p>
        ) : null}
      </section>

      {me.investments.length === 0 ? (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-[#3A3A3A]">No investments yet.</p>
        </div>
      ) : (
        me.investments.map((row) => {
          const progress = row.term_progress.days_total
            ? Math.min(100, Math.round((row.term_progress.days_elapsed / row.term_progress.days_total) * 100))
            : 0;
          return (
            <div key={row.id} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
            <Link
              href={`/account/investments/${row.id}`}
              className="block"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">{row.plan_name}</p>
                  <p className="mt-1 text-sm text-[#3A3A3A]">Principal {formatGhs(row.principal_pesewas)}</p>
                </div>
                <Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-[#3A3A3A]">
                Term {row.current_term} · {row.term_progress.days_elapsed} of {row.term_progress.days_total} days
              </p>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-[#FF7A19]" style={{ width: `${progress}%` }} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[#3A3A3A]">Next payout</dt>
                  <dd className="font-medium text-[#1A1A1A]">
                    {row.next_payout
                      ? `${formatDeviceDate(row.next_payout.date)} · ${formatGhs(row.next_payout.net_pesewas)}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#3A3A3A]">Paid so far</dt>
                  <dd className="font-medium text-[#1A1A1A]">{formatGhs(row.totals_paid_pesewas)}</dd>
                </div>
                <div>
                  <dt className="text-[#3A3A3A]">Scholar Fund</dt>
                  <dd className="font-medium text-[#1A1A1A]">{formatGhs(row.scholar_fund_deducted_pesewas)}</dd>
                </div>
                <div>
                  <dt className="text-[#3A3A3A]">Maturity</dt>
                  <dd className="font-medium text-[#1A1A1A]">{formatDeviceDate(row.maturity_date)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-sm text-[#3A3A3A]">
                Settlement: {row.principal_settlement?.status || '—'}
              </p>
            </Link>
            <InfoNote className="mt-3">
              Month 10 is the settlement month. VENTECH reconciles your investment and returns your principal of {vlbGhs(row.principal_pesewas)}. If you choose Renew, your principal starts a new 10-month cycle instead and is not paid out.
            </InfoNote>
            </div>
          );
        })
      )}

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[#1A1A1A]">Upgrade</h2>
          <Button size="sm" onClick={() => setUpgradeOpen(true)}>Request upgrade</Button>
        </div>
        <p className="mt-2 text-sm text-[#3A3A3A]">Ask VENTECH about moving to another plan.</p>
      </section>

      <DocumentsSection me={me} docs={docs} reload={load} />

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-[#1A1A1A]">Payout details</h2>
        <p className="mt-2 text-sm text-[#3A3A3A]">
          {payout.payout_method === 'momo'
            ? `${payout.momo_network || 'MoMo'} · ${payout.momo_number || '—'}`
            : payout.payout_method === 'bank'
              ? `${payout.bank_name || 'Bank'} · ${payout.bank_account_name || ''} · ${payout.bank_account_number || '—'}`
              : 'Not set yet'}
        </p>
        <p className="mt-2 text-xs text-[#3A3A3A]">
          To change these, contact VENTECH support.
        </p>
      </section>

      {upgradeOpen && (
        <Sheet
          title="Upgrade request"
          onClose={() => setUpgradeOpen(false)}
          footer={(
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
              <Button type="submit" form="vlb-upgrade" className="w-full sm:flex-1" disabled={busy}>{busy ? 'Sending…' : 'Send'}</Button>
            </div>
          )}
        >
          <form
            id="vlb-upgrade"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!planId) {
                toast.error('Select a plan');
                return;
              }
              setBusy(true);
              try {
                await vlbRequest('/api/vlb/me/upgrade-requests', {
                  method: 'POST',
                  body: JSON.stringify({ requested_plan_id: planId, message: message || undefined }),
                });
                toast.success('Upgrade request sent.');
                setUpgradeOpen(false);
                setMessage('');
              } catch (error) {
                toast.error(apiMessage(error, 'Could not send this request.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block text-sm font-medium text-[#1A1A1A]">Plan</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({formatGhs(plan.principal_pesewas)})
                </option>
              ))}
            </select>
            <label className="mt-3 block text-sm font-medium text-[#1A1A1A]">Message</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </form>
        </Sheet>
      )}
    </div>
  );
}

function DocRow({
  name,
  date,
  onDownload,
}: {
  name: string;
  date?: string | null;
  onDownload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-medium text-[#1A1A1A]">{name}</p>
        {date ? <p className="text-xs text-[#3A3A3A]">{formatDeviceDate(date)}</p> : null}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onDownload();
          } catch (error) {
            toast.error(apiMessage(error, 'Could not download this file.'));
          } finally {
            setBusy(false);
          }
        }}
      >
        Download
      </Button>
    </li>
  );
}

async function openDocumentWithRefresh(documentId: string, reload: () => Promise<void>) {
  try {
    await openSignedVlbDocument(documentId);
  } catch (error) {
    await reload();
    try {
      await openSignedVlbDocument(documentId);
    } catch {
      throw error;
    }
  }
}

function DocumentsSection({
  me,
  docs,
  reload,
}: {
  me: VlbMe;
  docs: VlbDocument[];
  reload: () => Promise<void>;
}) {
  const agreements = docs.filter((doc) => doc.kind === 'agreement');
  const others = docs.filter((doc) => doc.kind !== 'agreement' && doc.kind !== 'agreement_template');
  const template = docs.find((doc) => doc.kind === 'agreement_template');
  const receipts = me.investments
    .flatMap((investment) =>
      (investment.paid_payouts || []).map((payout) => ({
        ...payout,
        plan_name: investment.plan_name,
        investment_id: investment.id,
      }))
    )
    .sort((a, b) => String(b.paid_at || b.due_date).localeCompare(String(a.paid_at || a.due_date)));

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-semibold text-[#1A1A1A]">Documents</h2>
      <p className="mt-2 text-sm text-[#3A3A3A]">
        Your agreement, receipts and statements are kept here. Download links expire after 2 minutes for your security.
      </p>

      <h3 className="mt-4 text-sm font-medium text-[#1A1A1A]">Your agreement</h3>
      {agreements.length === 0 ? (
        <p className="mt-2 text-sm text-[#3A3A3A]">Your signed agreement will appear here once VENTECH has uploaded it.</p>
      ) : (
        <ul className="mt-1 divide-y divide-gray-100">
          {agreements.map((doc) => (
            <DocRow
              key={doc.id}
              name={doc.title}
              date={doc.created_at}
              onDownload={() => openDocumentWithRefresh(doc.id, reload)}
            />
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-medium text-[#1A1A1A]">Generated for you</h3>
      <ul className="mt-1 divide-y divide-gray-100">
        {me.investments.map((investment) => (
          <DocRow
            key={`confirm-${investment.id}`}
            name={`Investment confirmation · ${investment.plan_name}`}
            date={investment.start_date}
            onDownload={() => downloadAuthFile(
              `/api/vlb/me/investments/${investment.id}/confirmation.pdf`,
              `vlb-confirmation-${me.investor_no || investment.id}.pdf`
            )}
          />
        ))}
        {me.investments.map((investment) => (
          <DocRow
            key={`statement-${investment.id}`}
            name={`Statement · ${investment.plan_name}`}
            date={investment.start_date}
            onDownload={() => downloadAuthFile(
              `/api/vlb/me/investments/${investment.id}/statement.pdf`,
              `vlb-statement-${me.investor_no || investment.id}.pdf`
            )}
          />
        ))}
        {receipts.map((payout) => (
          <DocRow
            key={payout.id}
            name={`Payout receipt · ${payout.plan_name} · ${payout.type} ${payout.period_no}`}
            date={payout.paid_at || payout.due_date}
            onDownload={() => downloadAuthFile(
              `/api/vlb/me/payouts/${payout.id}/receipt.pdf`,
              `vlb-receipt-${payout.id}.pdf`
            )}
          />
        ))}
        {me.investments.length === 0 && (
          <li className="py-2 text-sm text-[#3A3A3A]">Generated documents will appear after activation.</li>
        )}
      </ul>

      <h3 className="mt-4 text-sm font-medium text-[#1A1A1A]">Other documents</h3>
      {others.length === 0 ? (
        <p className="mt-2 text-sm text-[#3A3A3A]">No other documents yet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-gray-100">
          {others.map((doc) => (
            <DocRow
              key={doc.id}
              name={doc.title}
              date={doc.created_at}
              onDownload={() => openDocumentWithRefresh(doc.id, reload)}
            />
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-medium text-[#1A1A1A]">Agreement template</h3>
      {template ? (
        <ul className="mt-1 divide-y divide-gray-100">
          <DocRow
            key={template.id}
            name={template.title}
            date={template.created_at}
            onDownload={() => openDocumentWithRefresh(template.id, reload)}
          />
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#3A3A3A]">The blank agreement template is not available yet.</p>
      )}
    </section>
  );
}
