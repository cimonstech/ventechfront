'use client';

import { formatTicketWhen, type RepairReceipt as Receipt } from '@/lib/ticketsAdmin';

export function RepairReceiptView({
  receipt,
  onPrint,
  onPdf,
  downloading,
}: {
  receipt: Receipt;
  onPrint: () => void;
  onPdf: () => void;
  downloading: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPrint}
          className="rounded-lg bg-[#FF7A19] px-4 py-2 text-sm font-medium text-white hover:bg-[#e66a0f]"
        >
          Print
        </button>
        <button
          type="button"
          onClick={onPdf}
          disabled={downloading}
          className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {downloading ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      <article className="receipt-print rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">VENTECH Gadgets</h1>
        <p className="mt-1 text-sm text-[#3A3A3A]">Service payment receipt</p>
        <dl className="mt-6 space-y-3 text-sm">
          <Row label="Ticket" value={receipt.ticket_no} />
          <Row label="Laptop" value={receipt.laptop_model} />
          <Row label="Amount" value={receipt.amount === null ? '—' : `GHS ${Number(receipt.amount).toFixed(2)}`} />
          <Row label="Method" value={receipt.method_label || receipt.method || '—'} />
          <Row label="Reference" value={receipt.reference || '—'} />
          <Row label="Date" value={formatTicketWhen(receipt.paid_at)} />
          <Row label="Contact" value={`${receipt.contact.email} · ${receipt.contact.phone}`} />
        </dl>
      </article>
      <style>{`
        @media print {
          nav, footer, aside, .no-print {
            display: none !important;
          }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
      <dt className="text-[#3A3A3A]">{label}</dt>
      <dd className="font-medium text-[#1A1A1A] text-right">{value}</dd>
    </div>
  );
}
