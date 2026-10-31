'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { AccessDenied, AccountListSkeleton, EmptyState, ErrorState } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { useOnlineRefetch } from '@/hooks/useOnlineRefetch';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import {
  deviceRequest,
  formatTicketWhen,
  statusVariant,
  STATUS_LABEL,
} from '@/lib/ticketsAdmin';

interface MyTicket {
  ticket_no: string;
  model: string;
  issue: string;
  status: string;
  updated_at: string;
}

export default function MyServiceRequestsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setFailed(false);
    setForbidden(false);
    try {
      const result = await deviceRequest<MyTicket[]>('/api/tickets/mine');
      setTickets(result.data || []);
    } catch (error) {
      const kind = noteQueryFail(error);
      if (kind === 'forbidden') setForbidden(true);
      else if (kind !== 'unauthorized') setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = safeRedirectPath('/account/service');
      router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
      return;
    }
    void loadTickets();
  }, [isAuthenticated, isLoading, router, loadTickets]);

  useOnlineRefetch(loadTickets);

  if (isLoading || !isAuthenticated || (loading && tickets.length === 0)) {
    return <AccountListSkeleton rows={3} />;
  }

  return (
    <div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="hidden text-2xl font-bold text-[#1A1A1A] md:block">Service requests</h1>
          <Link href="/account/service/new" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#FF7A19] px-4 text-sm font-semibold text-white sm:w-auto">New request</Link>
        </div>
        {forbidden ? (
          <AccessDenied
            title="You don't have access"
            description="You don't have access to this data."
            primary={{ label: 'Go to your account', href: '/account' }}
          />
        ) : failed && tickets.length === 0 ? (
          <ErrorState
            title="We couldn't load your requests"
            description="Try again in a moment. Existing tickets are still with our team."
            primary={{ label: 'Try again', onClick: () => void loadTickets() }}
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No service requests yet"
            description="When a laptop needs care, start a request here. We'll keep you posted as it moves."
            primary={{ label: 'New request', href: '/account/service/new' }}
            secondary={{ label: 'My devices', href: '/account/devices', variant: 'outline' }}
          />
        ) : (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.ticket_no}>
                <Link href={`/account/service/${encodeURIComponent(ticket.ticket_no)}`} className="block bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[#1A1A1A]">{ticket.ticket_no}</p>
                    <Badge size="sm" variant={statusVariant(ticket.status)}>{STATUS_LABEL[ticket.status] || ticket.status}</Badge>
                  </div>
                  <p className="text-sm text-[#1A1A1A] mt-2">{ticket.model}</p>
                  <p className="text-sm text-[#3A3A3A]">{ticket.issue || '—'}</p>
                  <p className="text-xs text-[#3A3A3A] mt-2">Updated {formatTicketWhen(ticket.updated_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
