'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  apiMessage,
  downloadAuthFile,
  formatDeviceDate,
  formatGhs,
  payoutStatusVariant,
  vlbRequest,
  type VlbInvestmentDetail,
} from '@/lib/vlb';

export default function AccountInvestmentDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [row, setRow] = useState<VlbInvestmentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = () =>
    vlbRequest<VlbInvestmentDetail>(`/api/vlb/me/investments/${id}`).then((result) => setRow(result.data));

  useEffect(() => {
    if (!id) return;
    load().catch((error) => toast.error(apiMessage(error, 'Could not load this investment.')));
  }, [id]);

  if (!row) {
    return <p className="text-sm text-[#3A3A3A]">Loading investment…</p>;
  }

  const choose = async (choice: 'settle' | 'renew') => {
    setBusy(true);
    try {
      await vlbRequest(`/api/vlb/me/investments/${id}/renewal`, {
        method: 'POST',
        body: JSON.stringify({ choice }),
      });
      toast.success('Renewal choice saved.');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save your renewal choice.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link href="/account/investments" className="text-sm font-medium text-[#FF7A19]">Back to investments</Link>
      <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">{row.plan_name}</h1>
            <p className="mt-1 text-sm text-[#3A3A3A]">{formatGhs(row.principal_pesewas)} · {row.investor_no}</p>
          </div>
          <Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>
        </div>
        <Button
          className="mt-4 w-full sm:w-auto"
          variant="outline"
          isLoading={downloading}
          onClick={async () => {
            setDownloading(true);
            try {
              await downloadAuthFile(
                `/api/vlb/me/investments/${id}/statement.pdf`,
                `vlb-statement-${row.investor_no || 'investment'}.pdf`
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
      </div>

      {row.renewal_open && (
        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold text-[#1A1A1A]">Renewal</h2>
          <p className="mt-2 text-sm text-[#3A3A3A]">
            Current choice: <span className="font-medium text-[#1A1A1A]">{row.renewal_choice}</span>.
            Deadline: before settlement on {formatDeviceDate(row.maturity_date)}.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant={row.renewal_choice === 'settle' ? 'primary' : 'outline'} disabled={busy} onClick={() => choose('settle')}>
              Settle
            </Button>
            <Button variant={row.renewal_choice === 'renew' ? 'primary' : 'outline'} disabled={busy} onClick={() => choose('renew')}>
              Renew
            </Button>
          </div>
        </section>
      )}

      <section className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-[#1A1A1A]">Schedule</h2>
        <table className="mt-3 min-w-[40rem] w-full text-left text-sm">
          <thead>
            <tr className="text-[#3A3A3A]">
              <th className="pb-2 font-medium">Period</th>
              <th className="pb-2 font-medium">Due</th>
              <th className="pb-2 font-medium">Gross</th>
              <th className="pb-2 font-medium">Scholar</th>
              <th className="pb-2 font-medium">Net</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Paid</th>
              <th className="pb-2 font-medium">Ref</th>
            </tr>
          </thead>
          <tbody>
            {row.schedule.map((payout) => (
              <tr key={payout.id} className="border-t border-gray-100">
                <td className="py-2">{payout.period_no}</td>
                <td className="py-2">{formatDeviceDate(payout.due_date)}</td>
                <td className="py-2">{formatGhs(payout.gross_pesewas)}</td>
                <td className="py-2">{formatGhs(payout.scholar_pesewas)}</td>
                <td className="py-2">{formatGhs(payout.net_pesewas)}</td>
                <td className="py-2"><Badge variant={payoutStatusVariant(payout.status)} size="sm">{payout.status}</Badge></td>
                <td className="py-2">{payout.paid_at ? formatDeviceDate(payout.paid_at) : '—'}</td>
                <td className="py-2">{payout.reference || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-[#1A1A1A]">Premium Stars</h2>
        <p className="mt-2 text-sm text-[#3A3A3A]">{row.stars_used} of {row.stars_total} used</p>
        {row.star_redemptions.length === 0 ? (
          <p className="mt-2 text-sm text-[#3A3A3A]">No redemptions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {row.star_redemptions.map((item) => (
              <li key={item.id} className="text-[#1A1A1A]">
                {item.product_note}
                <span className="ml-2 text-[#3A3A3A]">{formatDeviceDate(item.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-[#1A1A1A]">Referral bonuses</h2>
        {row.referral_bonuses.length === 0 ? (
          <p className="mt-2 text-sm text-[#3A3A3A]">No referral bonuses applied.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {row.referral_bonuses.map((item) => (
              <li key={item.id}>
                {item.bonus_percent}% from period {item.applied_from_period}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
