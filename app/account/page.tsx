'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DeviceWarrantyBadge } from '@/components/admin/DeviceWarrantyBadge';
import { Badge } from '@/components/ui/Badge';
import { CopyValue } from '@/components/ui/CopyValue';
import { useAccess } from '@/context/AccessContext';
import {
  fetchAccountOverview,
  hasAffiliateRole,
  hasActiveInvestorRole,
  type AccountOverview,
} from '@/lib/account';
import { formatGhs } from '@/lib/affiliates';
import {
  formatDeviceDate,
  formatGhs as formatVlbGhs,
  vlbRequest,
  type VlbMe,
} from '@/lib/vlb';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { apiMessage, formatTicketWhen, STATUS_LABEL, statusVariant } from '@/lib/ticketsAdmin';

export default function AccountOverviewPage() {
  const { access } = useAccess();
  const investor = hasActiveInvestorRole(access?.programRoles);
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [vlb, setVlb] = useState<VlbMe | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAccountOverview()
      .then((result) => {
        if (!cancelled) {
          setOverview(result.data);
          setFailed(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFailed(true);
          toast.error(apiMessage(error, 'Could not load your account'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!investor) {
      setVlb(null);
      return;
    }
    let cancelled = false;
    vlbRequest<VlbMe>('/api/vlb/me')
      .then((result) => {
        if (!cancelled) setVlb(result.data);
      })
      .catch((error) => {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load your investments'));
      });
    return () => {
      cancelled = true;
    };
  }, [investor]);

  if (!overview) {
    return (
      <p className="text-sm text-[#3A3A3A]">
        {failed ? 'Could not load your account.' : 'Loading your account…'}
      </p>
    );
  }

  const showAffiliateCta = !hasAffiliateRole(access?.programRoles) && !overview.affiliate;

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Overview</h1>
        <p className="mt-1 text-sm text-[#3A3A3A]">Your orders, laptops, and requests in one place.</p>
      </div>

      {investor && vlb && (
        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#1A1A1A]">Laptop Banking</h2>
              <p className="text-sm text-[#3A3A3A]">{vlb.investor_no || 'Investments'}</p>
            </div>
            <Link href="/account/investments" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#FF7A19]">Open dashboard</Link>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[#3A3A3A]">Total invested</dt>
              <dd className="font-medium text-[#1A1A1A]">{formatVlbGhs(vlb.summary?.total_invested_pesewas || 0)}</dd>
            </div>
            <div>
              <dt className="text-[#3A3A3A]">Next payout</dt>
              <dd className="font-medium text-[#1A1A1A]">
                {vlb.summary?.next_payout
                  ? `${formatDeviceDate(vlb.summary.next_payout.date)} · ${formatVlbGhs(vlb.summary.next_payout.net_pesewas)}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[#3A3A3A]">Received so far</dt>
              <dd className="font-medium text-[#1A1A1A]">{formatVlbGhs(vlb.summary?.received_pesewas || 0)}</dd>
            </div>
            <div>
              <dt className="text-[#3A3A3A]">Scholar Fund</dt>
              <dd className="font-medium text-[#1A1A1A]">{formatVlbGhs(vlb.summary?.scholar_fund_pesewas || 0)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#1A1A1A]">Orders</h2>
            <p className="text-sm text-[#3A3A3A]">{overview.orders.count} order{overview.orders.count === 1 ? '' : 's'}</p>
          </div>
          <Link href="/account/orders" className="text-sm font-semibold text-[#FF7A19]">View orders</Link>
        </div>
        {overview.orders.latest ? (
          <Link href="/account/orders" className="mt-3 block rounded-lg border border-gray-100 p-3">
            <p className="font-medium text-[#1A1A1A]">#{overview.orders.latest.order_number}</p>
            <p className="mt-1 text-sm text-[#3A3A3A]">
              {formatDate(overview.orders.latest.date)} · {formatCurrency(Number(overview.orders.latest.total))}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="info">{overview.orders.latest.status}</Badge>
              <Badge variant={overview.orders.latest.payment_status === 'paid' ? 'success' : 'warning'}>
                {overview.orders.latest.payment_status}
              </Badge>
            </div>
          </Link>
        ) : (
          <p className="mt-3 text-sm text-[#3A3A3A]">
            No orders yet.{' '}
            <Link href="/shop" className="font-semibold text-[#FF7A19]">Browse the shop</Link>
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#1A1A1A]">My devices</h2>
            <p className="text-sm text-[#3A3A3A]">
              {overview.devices.count} laptop{overview.devices.count === 1 ? '' : 's'}
              {overview.devices.warranty_ending_soon > 0
                ? ` · ${overview.devices.warranty_ending_soon} warranty ending within 60 days`
                : ''}
            </p>
          </div>
          <Link href="/account/devices" className="text-sm font-semibold text-[#FF7A19]">View devices</Link>
        </div>
        {overview.devices.items.length === 0 ? (
          <p className="mt-3 text-sm text-[#3A3A3A]">No laptops linked yet. Scan the QR sticker on your VENTECH laptop to add it.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {overview.devices.items.map((device, index) => (
              <li key={`${device.model}-${device.warranty_end || 'none'}-${index}`} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 font-medium text-[#1A1A1A]">{device.model}</p>
                  {device.status === 'pending' || device.warranty_status === 'pending' ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Being prepared
                    </span>
                  ) : (
                    <DeviceWarrantyBadge
                      warranty={{ status: device.warranty_status === 'starts_on_delivery' ? 'starts_on_delivery' : device.warranty_status as 'active' | 'expired' | 'none', endsOn: device.warranty_end }}
                    />
                  )}
                </div>
                {device.status === 'pending' || device.warranty_status === 'pending' ? (
                  <p className="mt-2 text-sm text-[#3A3A3A]">
                    Setup, care, and support are already in your laptop portal. Serial number and warranty dates appear once VENTECH registers it.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#1A1A1A]">Service requests</h2>
            <p className="text-sm text-[#3A3A3A]">{overview.service_requests.open_count} open</p>
          </div>
          <Link href="/account/service" className="text-sm font-semibold text-[#FF7A19]">View requests</Link>
        </div>
        {overview.service_requests.open.length === 0 ? (
          <p className="mt-3 text-sm text-[#3A3A3A]">
            No open requests.{' '}
            <Link href="/account/service/new" className="font-semibold text-[#FF7A19]">Start one</Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {overview.service_requests.open.map((ticket) => (
              <li key={ticket.ticket_number}>
                <Link
                  href={`/account/service/${encodeURIComponent(ticket.ticket_number)}`}
                  className="block rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[#1A1A1A]">{ticket.ticket_number}</p>
                    <Badge variant={statusVariant(ticket.status)}>{STATUS_LABEL[ticket.status] || ticket.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#3A3A3A]">{ticket.model} · {formatTicketWhen(ticket.updated_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#1A1A1A]">Wishlist</h2>
            <p className="text-sm text-[#3A3A3A]">
              {overview.wishlist_count === 0
                ? 'No saved items yet.'
                : `${overview.wishlist_count} saved item${overview.wishlist_count === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link href="/account/wishlist" className="text-sm font-semibold text-[#FF7A19]">View wishlist</Link>
        </div>
      </section>

      {overview.affiliate ? (
        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold text-[#1A1A1A]">Affiliate</h2>
            <Link href="/account/affiliate" className="text-sm font-semibold text-[#FF7A19]">Open dashboard</Link>
          </div>
          <p className="mt-2 text-sm text-[#3A3A3A]">
            Available {formatGhs(overview.affiliate.available_pesewas)} · Pending {formatGhs(overview.affiliate.pending_pesewas)}
          </p>
          {overview.affiliate.link ? (
            <p className="mt-2 text-sm text-[#1A1A1A]"><CopyValue value={overview.affiliate.link} /></p>
          ) : null}
        </section>
      ) : showAffiliateCta ? (
        <section className="rounded-xl border border-dashed border-[#FF7A19]/40 bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-[#1A1A1A]">Become an affiliate</h2>
          <p className="mt-1 text-sm text-[#3A3A3A]">Earn commission by sharing VENTECH products.</p>
          <Link href="/affiliate" className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#FF7A19]">
            Learn more
          </Link>
        </section>
      ) : null}

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#1A1A1A]">Profile and security</h2>
            <p className="text-sm text-[#3A3A3A]">Name, addresses, and notification preferences.</p>
          </div>
          <Link href="/account/profile" className="text-sm font-semibold text-[#FF7A19]">Edit profile</Link>
        </div>
      </section>
    </div>
  );
}
