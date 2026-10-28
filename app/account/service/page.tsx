'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import {
  apiMessage,
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

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = safeRedirectPath('/account/service');
      router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = await deviceRequest<MyTicket[]>('/api/tickets/mine');
        if (!cancelled) setTickets(result.data || []);
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Failed to load your requests'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-[#3A3A3A]">Loading your requests…</p>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="hidden text-2xl font-bold text-[#1A1A1A] md:block">Service requests</h1>
          <Link href="/account/service/new" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#FF7A19] px-4 text-sm font-semibold text-white sm:w-auto">New request</Link>
        </div>
        {tickets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-[#3A3A3A]">
            <p>No service requests yet.</p>
            <Link href="/account/devices" className="inline-block mt-3 font-semibold text-[#FF7A19]">My devices</Link>
          </div>
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
