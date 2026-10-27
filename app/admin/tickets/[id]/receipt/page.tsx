'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { RepairReceiptView } from '@/components/tickets/RepairReceipt';
import {
  RepairReceipt,
  apiMessage,
  deviceRequest,
  downloadReceiptPdf,
} from '@/lib/ticketsAdmin';

export default function AdminTicketReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [receipt, setReceipt] = useState<RepairReceipt | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    deviceRequest<RepairReceipt>(`/api/admin/tickets/${id}/receipt`)
      .then((result) => setReceipt(result.data))
      .catch((error) => toast.error(apiMessage(error, 'Could not load this receipt')));
  }, [id]);

  if (!receipt) {
    return (
      <div className="p-6">
        <Link href={`/admin/tickets/${id}`} className="text-sm text-[#FF7A19]">Back to ticket</Link>
        <p className="mt-4 text-sm text-[#3A3A3A]">Loading receipt…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print px-4 pt-4">
        <Link href={`/admin/tickets/${id}`} className="text-sm font-medium text-[#FF7A19]">Back to ticket</Link>
      </div>
      <RepairReceiptView
        receipt={receipt}
        onPrint={() => window.print()}
        downloading={downloading}
        onPdf={() => {
          setDownloading(true);
          downloadReceiptPdf(`/api/admin/tickets/${id}/receipt`, `${receipt.ticket_no}-receipt.pdf`)
            .catch((error) => toast.error(apiMessage(error, 'Could not download this receipt')))
            .finally(() => setDownloading(false));
        }}
      />
    </div>
  );
}
