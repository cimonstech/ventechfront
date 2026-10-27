'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import {
  apiMessage,
  deviceRequest,
  formatDeviceDate,
  formatTicketWhen,
  STATUS_LABEL,
  TICKET_STAGES,
} from '@/lib/ticketsAdmin';

interface CustomerEvent {
  id: string;
  type: string;
  to_status: string | null;
  body: string | null;
  actor_role: string | null;
  created_at: string;
}

interface CustomerMedia {
  id: string;
  kind: string;
  previewUrl: string;
}

interface CustomerTicket {
  ticket_no: string;
  status: string;
  laptop_model: string;
  serial_number: string | null;
  description: string;
  date_started: string;
  contact_name: string;
  contact_phone: string;
  issue: { id: string; name: string } | null;
  warranty_status_at_submit: string | null;
  order_number: string | null;
  closed_reason: string | null;
  events: CustomerEvent[];
  media: CustomerMedia[];
}

export default function ServiceRequestPage() {
  const params = useParams<{ ticketNo: string }>();
  const ticketNo = Array.isArray(params.ticketNo) ? params.ticketNo[0] : params.ticketNo || '';
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [ticket, setTicket] = useState<CustomerTicket | null>(null);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticketNo) return;
    try {
      const result = await deviceRequest<CustomerTicket>(`/api/tickets/mine/${encodeURIComponent(ticketNo)}`);
      setTicket(result.data);
      setFailed(false);
    } catch (error) {
      setFailed(true);
      toast.error(apiMessage(error, 'Could not load this request'));
    }
  }, [ticketNo]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = safeRedirectPath(`/account/service/${ticketNo}`);
      router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
      return;
    }
    void load();
  }, [isAuthenticated, isLoading, load, router, ticketNo]);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const result = await deviceRequest(`/api/tickets/mine/${encodeURIComponent(ticketNo)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: message.trim() }),
      });
      toast.success(result.message);
      setMessage('');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not send this message'));
    } finally {
      setSending(false);
    }
  };

  if (isLoading || !isAuthenticated || (!ticket && !failed)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-[#3A3A3A]">Loading request…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-sm text-[#3A3A3A]">Could not load this request.</p>
          <Link href="/account/service" className="text-sm font-semibold text-[#FF7A19]">Back to service requests</Link>
        </div>
      </div>
    );
  }

  const stageIndex = TICKET_STAGES.indexOf(ticket.status as (typeof TICKET_STAGES)[number]);
  const closed = ticket.status === 'completed' || ticket.status === 'closed';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/account/service" className="text-sm font-semibold text-[#FF7A19]">Back to service requests</Link>
        <h1 className="text-2xl font-bold text-[#1A1A1A] break-all">{ticket.ticket_no}</h1>

        {ticket.status === 'closed' && (
          <section className="bg-gray-100 border border-gray-200 rounded-xl p-4">
            <p className="text-lg font-bold text-[#1A1A1A]">Closed</p>
            <p className="text-sm text-[#1A1A1A] mt-2 whitespace-pre-wrap">{ticket.closed_reason || 'This request was closed.'}</p>
          </section>
        )}
        <ol className="flex gap-2 overflow-x-auto pb-1">
          {TICKET_STAGES.map((stage, index) => {
            const current = ticket.status === stage;
            const passed = stageIndex > index;
            return (
              <li
                key={stage}
                className={`min-w-[96px] flex-1 rounded-lg px-2 py-2 text-center text-[11px] font-semibold ${
                  current ? 'bg-[#FF7A19] text-white' : passed ? 'bg-orange-50 text-[#FF7A19]' : 'bg-white text-[#3A3A3A] border border-gray-200'
                }`}
              >
                {index + 1}. {STATUS_LABEL[stage]}
              </li>
            );
          })}
        </ol>

        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
          <h2 className="font-semibold text-[#1A1A1A]">Submitted details</h2>
          <p><span className="text-[#3A3A3A]">Laptop: </span>{ticket.laptop_model}</p>
          <p><span className="text-[#3A3A3A]">Serial: </span><span className="font-mono">{ticket.serial_number || '—'}</span></p>
          <p><span className="text-[#3A3A3A]">Issue: </span>{ticket.issue?.name || '—'}</p>
          <p><span className="text-[#3A3A3A]">Started: </span>{formatDeviceDate(ticket.date_started) || '—'}</p>
          <p className="whitespace-pre-wrap text-[#1A1A1A]">{ticket.description}</p>
          <p><span className="text-[#3A3A3A]">Warranty at submit: </span><span className="capitalize">{ticket.warranty_status_at_submit || '—'}</span></p>
          {ticket.order_number ? <p><span className="text-[#3A3A3A]">Order: </span>{ticket.order_number}</p> : null}
          <p><span className="text-[#3A3A3A]">Contact: </span>{ticket.contact_name} · {ticket.contact_phone}</p>
        </section>

        {ticket.media?.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-[#1A1A1A]">Files</h2>
            <div className="grid grid-cols-2 gap-3">
              {ticket.media.map((file) => (
                file.kind === 'video' ? (
                  <video key={file.id} src={file.previewUrl} controls className="w-full rounded-lg bg-black" />
                ) : file.kind === 'receipt' ? (
                  <a key={file.id} href={file.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-28 rounded-lg border border-gray-200 text-sm font-semibold text-[#FF7A19]">
                    Open receipt
                  </a>
                ) : (
                  <button key={file.id} type="button" onClick={() => setLightbox(file.previewUrl)} className="block">
                    <img src={file.previewUrl} alt="" className="h-28 w-full object-cover rounded-lg bg-gray-100" />
                  </button>
                )
              ))}
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-[#1A1A1A]">Updates</h2>
          {(ticket.events || []).length === 0 ? (
            <p className="text-sm text-[#3A3A3A]">No updates yet.</p>
          ) : (
            <ol className="space-y-3">
              {ticket.events.map((event) => (
                <li key={event.id} className="rounded-lg bg-orange-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#1A1A1A]">{event.actor_role === 'customer' ? 'You' : 'VENTECH Support'}</span>
                    {event.to_status ? <span className="text-[#3A3A3A]">{STATUS_LABEL[event.to_status] || event.to_status}</span> : null}
                    <span className="text-xs text-[#3A3A3A] ml-auto">{formatTicketWhen(event.created_at)}</span>
                  </div>
                  {event.body ? <p className="mt-2 whitespace-pre-wrap text-[#1A1A1A]">{event.body}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        {closed ? (
          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-[#1A1A1A]">This request is closed. Please open a new one.</p>
            <Link href="/account/service/new" className="inline-flex items-center justify-center rounded-lg bg-[#FF7A19] px-4 py-2 text-sm font-medium text-white">
              Start a new request
            </Link>
          </section>
        ) : (
          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-[#1A1A1A]">Send a message to VENTECH</h2>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <Button className="w-full" disabled={sending || !message.trim()} isLoading={sending} onClick={() => void send()}>
              Send
            </Button>
          </section>
        )}
      </div>

      {lightbox && (
        <button type="button" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Attachment" className="max-h-[90vh] max-w-full object-contain" />
        </button>
      )}
    </div>
  );
}
