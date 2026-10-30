'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import {
  PAYMENT_METHODS,
  TicketAssignee,
  TicketDetail,
  TicketStatus,
  apiMessage,
  deviceRequest,
  formatDeviceDate,
  formatTicketWhen,
  statusVariant,
  STATUS_LABEL,
  TICKET_STAGES,
} from '@/lib/ticketsAdmin';

export default function ServiceRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { canEdit } = useAccess();
  const editable = canEdit('tickets');
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [assignees, setAssignees] = useState<TicketAssignee[]>([]);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState('');
  const [backNote, setBackNote] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [composer, setComposer] = useState<'reply' | 'note'>('reply');
  const [message, setMessage] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [warrantyJob, setWarrantyJob] = useState('');
  const [resolution, setResolution] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('cash');
  const [payReference, setPayReference] = useState('');
  const [working, setWorking] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const mediaRefreshed = useRef(false);

  useSetAdminHeading(ticket?.ticket_no || 'Service request', id || null);

  const applySide = (row: TicketDetail) => {
    setAssigneeId(row.assignee?.id || '');
    setWarrantyJob(row.is_warranty === null || row.is_warranty === undefined ? '' : row.is_warranty ? 'yes' : 'no');
    setResolution(row.resolution || '');
    setRepairCost(row.repair_cost === null || row.repair_cost === undefined ? '' : String(row.repair_cost));
  };

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const result = await deviceRequest<TicketDetail>(`/api/admin/tickets/${id}`);
      setTicket(result.data);
      applySide(result.data);
      setFailed(false);
    } catch (error) {
      setFailed(true);
      toast.error(apiMessage(error, 'Could not load this ticket'));
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      mediaRefreshed.current = false;
      void load();
    }, 90 * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    deviceRequest<TicketAssignee[]>('/api/admin/tickets/assignees')
      .then((result) => {
        if (!cancelled) setAssignees(result.data || []);
      })
      .catch((error) => toast.error(apiMessage(error, 'Could not load assignees')));
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (path: string, body: unknown, fallback: string) => {
    setWorking(true);
    try {
      const result = await deviceRequest(path, { method: 'POST', body: JSON.stringify(body) });
      toast.success(result.message);
      await load();
      return true;
    } catch (error) {
      toast.error(apiMessage(error, fallback));
      return false;
    } finally {
      setWorking(false);
    }
  };

  if (!ticket) {
    return <p className="text-sm text-[#3A3A3A]">{failed ? 'Could not load this ticket.' : 'Loading request…'}</p>;
  }

  const stageIndex = TICKET_STAGES.indexOf(ticket.status as (typeof TICKET_STAGES)[number]);
  const nextStatus = stageIndex >= 0 && stageIndex < TICKET_STAGES.length - 1 ? TICKET_STAGES[stageIndex + 1] : null;
  const previousStatus = stageIndex > 0 ? TICKET_STAGES[stageIndex - 1] : null;
  const closed = ticket.status === 'closed';

  const saveSide = async () => {
    const cost = repairCost.trim() === '' ? null : Number(repairCost);
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      toast.error('Enter a repair cost of zero or more.');
      return;
    }
    setWorking(true);
    try {
      const assigned = assigneeId || null;
      if (!ticket.assignee?.locked && assigned !== (ticket.assignee?.id || null)) {
        const assignResult = await deviceRequest(`/api/admin/tickets/${id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ user_id: assigned }),
        });
        toast.success(assignResult.message);
      }
      const patch: Record<string, unknown> = {
        resolution: resolution.trim() ? resolution.trim() : null,
        repair_cost: cost,
      };
      if (warrantyJob === 'yes' || warrantyJob === 'no') patch.is_warranty = warrantyJob === 'yes';
      const result = await deviceRequest(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      toast.success(result.message);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update this ticket'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/tickets" className="text-sm font-medium text-[#FF7A19]">Back to service requests</Link>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#1A1A1A]">{ticket.ticket_no}</h2>
              <Badge variant={statusVariant(ticket.status)}>{STATUS_LABEL[ticket.status] || ticket.status}</Badge>
            </div>
            <p className="text-sm text-[#1A1A1A]">{ticket.laptop_model}{ticket.serial_number ? ` · ${ticket.serial_number}` : ''}</p>
            <p className="text-sm font-medium text-[#1A1A1A]">{ticket.customer?.name || ticket.contact_name}</p>
            <p className="text-sm">
              <a className="text-[#FF7A19] font-medium" href={`tel:${ticket.contact_phone}`}>{ticket.contact_phone}</a>
              {ticket.customer?.email ? (
                <>
                  {' · '}
                  <a className="text-[#FF7A19] font-medium" href={`mailto:${ticket.customer.email}`}>{ticket.customer.email}</a>
                </>
              ) : null}
            </p>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
            <ol className="flex flex-col gap-2 md:flex-row md:overflow-x-auto md:pb-1">
              {TICKET_STAGES.map((stage, index) => {
                const current = ticket.status === stage;
                const passed = stageIndex > index;
                return (
                  <li key={stage} className={`rounded-lg px-3 py-3 text-sm font-semibold md:min-w-[108px] md:flex-1 md:px-2 md:py-2 md:text-center md:text-xs ${
                    current ? 'bg-[#FF7A19] text-white' : passed ? 'bg-orange-50 text-[#FF7A19]' : 'bg-gray-100 text-[#3A3A3A]'
                  }`}>
                    {index + 1}. {STATUS_LABEL[stage]}
                  </li>
                );
              })}
            </ol>
            {editable && !closed && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Optional note for the customer" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <Button className="w-full" disabled={!nextStatus || working} isLoading={working} onClick={async () => {
                    if (!nextStatus) return;
                    const ok = await run(`/api/admin/tickets/${id}/status`, { to_status: nextStatus, note: note.trim() || undefined }, 'Could not update the status');
                    if (ok) setNote('');
                  }}>Move to next stage</Button>
                </div>
                <div className="space-y-2">
                  <textarea value={backNote} onChange={(event) => setBackNote(event.target.value)} rows={3} placeholder="Note required to move back" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <Button className="w-full" variant="outline" disabled={!previousStatus || working} onClick={async () => {
                    if (!previousStatus) return;
                    if (!backNote.trim()) {
                      toast.error('Add a note to move the request back a step.');
                      return;
                    }
                    const ok = await run(`/api/admin/tickets/${id}/status`, { to_status: previousStatus as TicketStatus, note: backNote.trim() }, 'Could not update the status');
                    if (ok) setBackNote('');
                  }}>Move back</Button>
                </div>
                <div className="space-y-2">
                  <textarea value={closeReason} onChange={(event) => setCloseReason(event.target.value)} rows={3} placeholder="Reason required to close" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <Button className="w-full" variant="secondary" disabled={working} onClick={async () => {
                    if (!closeReason.trim()) {
                      toast.error('A reason is required to close this request.');
                      return;
                    }
                    const ok = await run(`/api/admin/tickets/${id}/status`, { to_status: 'closed', closed_reason: closeReason.trim() }, 'Could not update the status');
                    if (ok) setCloseReason('');
                  }}>Close (not resolved)</Button>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-2 text-sm">
            <h3 className="font-semibold text-[#1A1A1A]">Submitted details</h3>
            <p><span className="text-[#3A3A3A]">Issue: </span>{ticket.issue_type?.name || '—'}</p>
            <p><span className="text-[#3A3A3A]">Started: </span>{formatDeviceDate(ticket.date_started) || '—'}</p>
            <p className="whitespace-pre-wrap text-[#1A1A1A]">{ticket.description}</p>
            <p><span className="text-[#3A3A3A]">Warranty at submit: </span><span className="capitalize">{ticket.warranty_status_at_submit || '—'}</span></p>
            <p>
              <span className="text-[#3A3A3A]">Device: </span>
              {ticket.device?.id ? (
                <Link href={`/admin/devices/${ticket.device.id}`} className="text-[#FF7A19] font-medium">{ticket.device.model_name} · {ticket.device.serial_number}</Link>
              ) : 'Not linked'}
            </p>
            <p>
              <span className="text-[#3A3A3A]">Order: </span>
              {ticket.order?.id ? (
                <Link href={`/admin/orders?open=${ticket.order.id}`} className="text-[#FF7A19] font-medium">{ticket.order.order_number}</Link>
              ) : (ticket.order_number_text || '—')}
            </p>
          </section>

          {ticket.media?.length > 0 && (
            <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-3">
              <h3 className="font-semibold text-[#1A1A1A]">Files</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ticket.media.map((file) => (
                  <MediaItem
                    key={file.id}
                    file={file}
                    onOpen={setLightbox}
                    onExpire={() => {
                      if (mediaRefreshed.current) return;
                      mediaRefreshed.current = true;
                      void load();
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-3">
            <h3 className="font-semibold text-[#1A1A1A]">Timeline</h3>
            <ol className="space-y-3">
              {(ticket.events || []).map((event) => (
                <li key={event.id} className={`rounded-lg p-3 text-sm ${event.is_internal ? 'bg-gray-100' : 'bg-orange-50'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {event.is_internal && <span className="text-[10px] font-bold uppercase tracking-wide text-[#3A3A3A]">Internal</span>}
                    <span className="font-semibold text-[#1A1A1A] capitalize">{event.type.replace('_', ' ')}</span>
                    {event.to_status && <span className="text-[#3A3A3A]">{STATUS_LABEL[event.to_status] || event.to_status}</span>}
                    <span className="text-xs text-[#3A3A3A] ml-auto">{formatTicketWhen(event.created_at)}</span>
                  </div>
                  {event.body && <p className="mt-2 whitespace-pre-wrap text-[#1A1A1A]">{event.body}</p>}
                </li>
              ))}
            </ol>
          </section>

          {editable && (
            <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-3">
              <div className="flex gap-2">
                <button type="button" className={`px-3 py-1.5 rounded-full text-sm font-medium ${composer === 'reply' ? 'bg-[#FF7A19] text-white' : 'bg-gray-100'}`} onClick={() => setComposer('reply')}>Reply to customer</button>
                <button type="button" className={`px-3 py-1.5 rounded-full text-sm font-medium ${composer === 'note' ? 'bg-[#1A1A1A] text-white' : 'bg-gray-100'}`} onClick={() => setComposer('note')}>Internal note</button>
              </div>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={composer === 'reply' ? 'This email goes to the customer' : 'Staff only. This is not emailed.'} />
              <Button disabled={working || !message.trim()} isLoading={working} onClick={async () => {
                const path = composer === 'reply' ? 'reply' : 'note';
                const ok = await run(`/api/admin/tickets/${id}/${path}`, { body: message.trim() }, 'Could not send this message');
                if (ok) setMessage('');
              }}>{composer === 'reply' ? 'Send reply' : 'Save note'}</Button>
            </section>
          )}
        </div>

        <aside className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4 h-fit">
          <h3 className="font-semibold text-[#1A1A1A]">Handling</h3>
          <label className="block text-sm">
            <span className="font-medium text-[#1A1A1A]">Assign to</span>
            {ticket.assignee?.locked ? (
              <p className="mt-1 text-[#3A3A3A]">{ticket.assignee.name || 'VENTECH Team'}</p>
            ) : editable ? (
              <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Unassigned</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>{person.name || person.email}</option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-[#3A3A3A]">{ticket.assignee?.name || 'Unassigned'}</p>
            )}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1A1A1A]">Warranty job</span>
            {editable ? (
              <select value={warrantyJob} onChange={(event) => setWarrantyJob(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Not set</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            ) : (
              <p className="mt-1 text-[#3A3A3A]">{ticket.is_warranty === true ? 'Yes' : ticket.is_warranty === false ? 'No' : 'Not set'}</p>
            )}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1A1A1A]">Resolution summary</span>
            {editable ? (
              <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} rows={4} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-[#3A3A3A]">{ticket.resolution || '—'}</p>
            )}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1A1A1A]">Repair cost</span>
            {editable ? (
              <input type="number" min={0} step="0.01" value={repairCost} onChange={(event) => setRepairCost(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
            ) : (
              <p className="mt-1 text-[#3A3A3A]">{ticket.repair_cost ?? '—'}</p>
            )}
          </label>
          {ticket.repair_paid ? (
            <div className="space-y-2 text-sm">
              <p className="text-[#1A1A1A]">
                Paid {ticket.repair_paid_amount === null || ticket.repair_paid_amount === undefined
                  ? ''
                  : `GHS ${Number(ticket.repair_paid_amount).toFixed(2)} `}
                {ticket.repair_paid_method
                  ? `by ${PAYMENT_METHODS.find((method) => method.id === ticket.repair_paid_method)?.label || ticket.repair_paid_method}`
                  : ''}
              </p>
              <Link href={`/admin/tickets/${id}/receipt`} className="inline-flex w-full items-center justify-center rounded-lg bg-[#1A1A1A] px-4 py-2 font-medium text-white">
                Receipt
              </Link>
            </div>
          ) : editable ? (
            <Button
              className="w-full"
              variant="secondary"
              disabled={working}
              onClick={() => {
                setPayAmount(repairCost.trim() === '' ? (ticket.repair_cost === null || ticket.repair_cost === undefined ? '' : String(ticket.repair_cost)) : repairCost);
                setPayMethod('cash');
                setPayReference('');
                setPayOpen(true);
              }}
            >
              Record payment
            </Button>
          ) : (
            <p className="text-sm text-[#3A3A3A]">Repair paid: No</p>
          )}
          {editable && <Button className="w-full" isLoading={working} onClick={saveSide}>Save</Button>}
          <div>
            <h3 className="font-semibold text-[#1A1A1A] mb-2">Previous tickets</h3>
            {(ticket.previous_tickets || []).length === 0 ? (
              <p className="text-sm text-[#3A3A3A]">None</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ticket.previous_tickets.map((item) => (
                  <li key={item.ticket_no}>
                    <Link href={`/admin/tickets?search=${encodeURIComponent(item.ticket_no)}`} className="text-[#FF7A19] font-medium">{item.ticket_no}</Link>
                    <p className="text-xs text-[#3A3A3A]">{STATUS_LABEL[item.status] || item.status} · {formatDeviceDate(item.date)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 space-y-3">
            <h3 className="font-semibold text-[#1A1A1A]">Record payment</h3>
            <label className="block text-sm">
              Amount
              <input
                type="number"
                min={0}
                step="0.01"
                value={payAmount}
                onChange={(event) => setPayAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Method
              <select
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value as typeof payMethod)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.id} value={method.id}>{method.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Reference {payMethod === 'cash' ? '(optional)' : ''}
              <input
                value={payReference}
                onChange={(event) => setPayReference(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                isLoading={working}
                onClick={async () => {
                  const amount = Number(payAmount);
                  if (!Number.isFinite(amount) || amount < 0) {
                    toast.error('Enter a valid amount.');
                    return;
                  }
                  if (payMethod !== 'cash' && !payReference.trim()) {
                    toast.error('A reference is required for this payment method.');
                    return;
                  }
                  const ok = await run(`/api/admin/tickets/${id}/payment`, {
                    amount,
                    method: payMethod,
                    reference: payReference.trim() || undefined,
                  }, 'Could not record this payment');
                  if (ok) setPayOpen(false);
                }}
              >
                Save payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <button type="button" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Ticket attachment" className="max-h-[90vh] max-w-full object-contain" />
        </button>
      )}
    </div>
  );
}

function MediaItem({
  file,
  onOpen,
  onExpire,
}: {
  file: TicketDetail['media'][number];
  onOpen: (url: string) => void;
  onExpire: () => void;
}) {
  if (file.kind === 'video') {
    return <video src={file.previewUrl} controls className="w-full rounded-lg bg-black" onError={onExpire} />;
  }
  if (file.kind === 'receipt') {
    return (
      <a href={file.previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-28 rounded-lg border border-gray-200 text-sm font-semibold text-[#FF7A19]">
        Open receipt
      </a>
    );
  }
  return (
    <button type="button" onClick={() => onOpen(file.previewUrl)} className="block">
      <img src={file.previewUrl} alt="" className="h-28 w-full object-cover rounded-lg bg-gray-100" onError={onExpire} />
    </button>
  );
}
