'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, FileText, Film, Phone, Send, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InfoNote } from '@/components/ui/InfoNote';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import {
  apiMessage,
  deviceRequest,
  formatDeviceDate,
  formatTicketWhen,
  statusVariant,
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
  repair_paid: boolean;
  events: CustomerEvent[];
  media: CustomerMedia[];
}

const STAGE_SHORT: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Review',
  diagnosing: 'Diagnose',
  repair_resolution: 'Repair',
  ready: 'Ready',
  completed: 'Done',
};

const STAGE_EXPLAIN: Record<string, string> = {
  submitted: "We've received your request.",
  under_review: 'A technician is reviewing your details.',
  diagnosing: "We're finding the cause.",
  repair_resolution: "We're fixing the issue or preparing a solution.",
  ready: 'Your laptop is ready for collection or delivery.',
  completed: 'This request is complete.',
};

function stageLine(status: string, closedReason?: string | null): string | null {
  if (status === 'closed') return `This request was closed: ${closedReason || '—'}.`;
  return STAGE_EXPLAIN[status] || null;
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
  const mediaRefreshed = useRef(false);

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
    const timer = window.setInterval(() => {
      mediaRefreshed.current = false;
      void load();
    }, 90 * 1000);
    return () => window.clearInterval(timer);
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
      <div className="min-h-[50vh] flex items-center justify-center bg-[#F4F1EC] px-4">
        <p className="text-sm text-[#3A3A3A]">Loading request…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F4F1EC] py-8 px-4">
        <div className="max-w-3xl mx-auto min-w-0 space-y-4">
          <p className="text-sm text-[#3A3A3A]">Could not load this request.</p>
          <Link href="/account/service" className="text-sm font-semibold text-[#FF7A19]">Back to service requests</Link>
        </div>
      </div>
    );
  }

  const stageIndex = TICKET_STAGES.indexOf(ticket.status as (typeof TICKET_STAGES)[number]);
  const closed = ticket.status === 'completed' || ticket.status === 'closed';
  const currentLabel = STATUS_LABEL[ticket.status] || ticket.status;

  return (
    <div className="min-h-screen bg-[#F4F1EC] overflow-x-clip">
      <div className="max-w-3xl mx-auto min-w-0 px-4 py-6 sm:py-10 space-y-6">
        <Link
          href="/account/service"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF7A19] hover:text-[#E66600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] rounded"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to service requests
        </Link>

        <header className="rounded-2xl bg-[#1A1A1A] text-white px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF7A19]">Service request</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight break-words text-white">{ticket.ticket_no}</h1>
              <p className="mt-2 text-sm text-white/80 min-w-0 break-words">{ticket.laptop_model}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge size="lg" variant={statusVariant(ticket.status)}>
                {currentLabel}
              </Badge>
              {ticket.repair_paid ? (
                <Link
                  href={`/account/service/${ticket.ticket_no}/receipt`}
                  className="inline-flex min-h-11 items-center rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[#1A1A1A] hover:bg-orange-50"
                >
                  Receipt
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        {ticket.status === 'closed' && (
          <section className="rounded-2xl border border-[#1A1A1A] bg-white px-5 py-5">
            <p className="text-lg font-bold text-[#1A1A1A]">Closed</p>
            <p className="mt-2 text-sm leading-relaxed text-[#3A3A3A] whitespace-pre-wrap">{ticket.closed_reason || 'This request was closed.'}</p>
          </section>
        )}

        <section className="rounded-2xl bg-white px-4 py-5 sm:px-6">
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {ticket.status === 'closed' ? 'This request is closed' : currentLabel}
            {stageIndex >= 0 && ticket.status !== 'closed' ? (
              <span className="font-normal text-[#3A3A3A]"> · step {stageIndex + 1} of {TICKET_STAGES.length}</span>
            ) : null}
          </p>
          <ol className="mt-4 flex flex-col gap-2 md:grid md:grid-cols-6">
            {TICKET_STAGES.map((stage, index) => {
              const current = ticket.status === stage;
              const passed = stageIndex > index;
              return (
                <li
                  key={stage}
                  className={`min-w-0 rounded-xl px-3 py-3 md:px-2 md:text-center ${
                    current
                      ? 'bg-[#FF7A19] text-white'
                      : passed
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#F4F1EC] text-[#3A3A3A]'
                  }`}
                >
                  <span className="flex items-center gap-3 md:block">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold md:mx-auto md:mb-1 ${
                      current ? 'bg-white text-[#FF7A19]' : passed ? 'bg-[#FF7A19] text-white' : 'bg-white text-[#3A3A3A]'
                    }`}>
                      {passed ? <Check size={12} aria-hidden /> : index + 1}
                    </span>
                    <span className="text-sm font-semibold leading-tight md:mt-0 md:block md:text-[11px]">{STAGE_SHORT[stage]}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          {stageLine(ticket.status, ticket.closed_reason) ? (
            <InfoNote className="mt-4">
              {stageLine(ticket.status, ticket.closed_reason)}
            </InfoNote>
          ) : null}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17.5rem] gap-6 items-start">
          <div className="min-w-0 space-y-6 order-2 lg:order-1">
            <section className="rounded-2xl bg-white px-4 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-[#1A1A1A]">Updates</h2>
              {(ticket.events || []).length === 0 ? (
                <p className="mt-4 text-sm text-[#3A3A3A]">No updates yet.</p>
              ) : (
                <ol className="mt-5 space-y-4">
                  {ticket.events.map((event) => (
                    <TimelineItem key={event.id} event={event} />
                  ))}
                </ol>
              )}
            </section>

            {closed ? (
              <section className="rounded-2xl bg-white px-5 py-6 space-y-3">
                <p className="text-sm text-[#1A1A1A]">This request is closed. Please open a new one.</p>
                <Link
                  href="/account/service/new"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FF7A19] px-4 py-2 text-sm font-medium text-white hover:bg-[#E66600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] focus-visible:ring-offset-2"
                >
                  Start a new request
                </Link>
              </section>
            ) : (
              <section className="rounded-2xl bg-white px-4 py-5 sm:px-6 space-y-3">
                <h2 className="text-base font-semibold text-[#1A1A1A]">Send a message to VENTECH</h2>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Ask a question or add more detail"
                  className="w-full min-w-0 rounded-xl border border-gray-300 bg-[#F4F1EC] px-3 py-3 text-sm text-[#1A1A1A] placeholder:text-[#3A3A3A]/70 focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-[#FF7A19]"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#3A3A3A]">{message.length} / 2000</p>
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={sending || !message.trim()}
                    isLoading={sending}
                    icon={!sending ? <Send size={16} aria-hidden /> : undefined}
                    onClick={() => void send()}
                  >
                    Send
                  </Button>
                </div>
              </section>
            )}
          </div>

          <aside className="min-w-0 space-y-6 order-1 lg:order-2">
            <section className="rounded-2xl bg-white px-5 py-5">
              <h2 className="text-base font-semibold text-[#1A1A1A]">Submitted details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Fact label="Laptop" value={ticket.laptop_model} />
                <Fact label="Serial" value={ticket.serial_number || '—'} mono />
                <Fact label="Issue" value={ticket.issue?.name || '—'} />
                <Fact label="Started" value={formatDeviceDate(ticket.date_started) || '—'} />
                <Fact label="Warranty at submit" value={ticket.warranty_status_at_submit || '—'} capitalize />
                {ticket.order_number ? <Fact label="Order" value={ticket.order_number} /> : null}
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#3A3A3A]">Contact</dt>
                  <dd className="mt-1 font-medium text-[#1A1A1A] break-words">{ticket.contact_name}</dd>
                  <a
                    href={`tel:${ticket.contact_phone}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF7A19] hover:text-[#E66600]"
                  >
                    <Phone size={14} aria-hidden />
                    {ticket.contact_phone}
                  </a>
                </div>
              </dl>
              <p className="mt-5 text-sm leading-relaxed text-[#1A1A1A] whitespace-pre-wrap border-t border-gray-100 pt-4">
                {ticket.description}
              </p>
            </section>

            {ticket.media?.length > 0 && (
              <section className="rounded-2xl bg-white px-5 py-5">
                <h2 className="text-base font-semibold text-[#1A1A1A]">Files</h2>
                <ul className="mt-4 grid grid-cols-2 gap-3">
                  {ticket.media.map((file) => (
                    <li key={file.id} className="min-w-0">
                      {file.kind === 'video' ? (
                        <video
                          src={file.previewUrl}
                          controls
                          className="w-full aspect-[4/3] rounded-xl bg-black object-cover"
                          onError={() => {
                            if (mediaRefreshed.current) return;
                            mediaRefreshed.current = true;
                            void load();
                          }}
                        />
                      ) : file.kind === 'receipt' ? (
                        <a
                          href={file.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl bg-[#F4F1EC] text-sm font-semibold text-[#FF7A19] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
                        >
                          <FileText size={22} aria-hidden />
                          Open receipt
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLightbox(file.previewUrl)}
                          className="group relative block w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
                        >
                          <img
                            src={file.previewUrl}
                            alt=""
                            className="aspect-[4/3] w-full object-cover bg-gray-100"
                            onError={() => {
                              if (mediaRefreshed.current) return;
                              mediaRefreshed.current = true;
                              void load();
                            }}
                          />
                          <span className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </button>
                      )}
                      {file.kind === 'video' && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#3A3A3A]">
                          <Film size={12} aria-hidden /> Video
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 p-4 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close photo"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1A1A1A] hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
            onClick={() => setLightbox(null)}
          >
            <X size={18} aria-hidden />
          </button>
          <button type="button" className="max-h-[90vh] max-w-full" onClick={() => setLightbox(null)}>
            <img
              src={lightbox}
              alt="Attachment"
              className="max-h-[90vh] max-w-full object-contain"
              onError={() => {
                if (mediaRefreshed.current) return;
                mediaRefreshed.current = true;
                setLightbox(null);
                void load();
              }}
            />
          </button>
        </div>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#3A3A3A]">{label}</dt>
      <dd className={`mt-0.5 font-medium text-[#1A1A1A] break-words ${mono ? 'font-mono text-[13px]' : ''} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function TimelineItem({ event }: { event: CustomerEvent }) {
  const fromYou = event.actor_role === 'customer';
  const when = formatTicketWhen(event.created_at);
  if (event.type === 'reply') {
    return (
      <li className={`flex ${fromYou ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[92%] min-w-0 rounded-2xl px-4 py-3 ${fromYou ? 'bg-[#1A1A1A] text-white rounded-br-sm' : 'bg-[#FFF4EB] text-[#1A1A1A] rounded-bl-sm'}`}>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className={`text-xs font-semibold ${fromYou ? 'text-[#FF7A19]' : 'text-[#FF7A19]'}`}>
              {fromYou ? 'You' : 'VENTECH Support'}
            </span>
            <span className={`text-[11px] ${fromYou ? 'text-white/60' : 'text-[#3A3A3A]'}`}>{when}</span>
          </div>
          {event.body ? <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">{event.body}</p> : null}
        </div>
      </li>
    );
  }

  const heading = event.type === 'created'
    ? 'Request submitted'
    : event.type === 'payment'
      ? 'Payment received'
      : event.to_status
        ? STATUS_LABEL[event.to_status] || event.to_status
        : event.type.replace('_', ' ');

  return (
    <li className="flex justify-center">
      <div className="w-full rounded-xl border border-dashed border-gray-200 px-4 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3A3A3A]">
          {fromYou ? 'You' : 'VENTECH Support'} · {when}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{heading}</p>
        {event.type !== 'created' && event.body ? (
          <p className="mt-1 text-sm text-[#3A3A3A] whitespace-pre-wrap break-words">{event.body}</p>
        ) : null}
      </div>
    </li>
  );
}
