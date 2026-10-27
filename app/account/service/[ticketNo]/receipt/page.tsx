'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RepairReceiptView } from '@/components/tickets/RepairReceipt';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import {
  RepairReceipt,
  apiMessage,
  deviceRequest,
  downloadReceiptPdf,
} from '@/lib/ticketsAdmin';

export default function CustomerTicketReceiptPage() {
  const params = useParams<{ ticketNo: string }>();
  const ticketNo = Array.isArray(params.ticketNo) ? params.ticketNo[0] : params.ticketNo || '';
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [receipt, setReceipt] = useState<RepairReceipt | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = safeRedirectPath(`/account/service/${ticketNo}/receipt`);
      router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
      return;
    }
    deviceRequest<RepairReceipt>(`/api/tickets/mine/${encodeURIComponent(ticketNo)}/receipt`)
      .then((result) => setReceipt(result.data))
      .catch((error) => toast.error(apiMessage(error, 'Could not load this receipt')));
  }, [isAuthenticated, isLoading, router, ticketNo]);

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <Link href={`/account/service/${ticketNo}`} className="text-sm text-[#FF7A19]">Back to request</Link>
        <p className="mt-4 text-sm text-[#3A3A3A]">Loading receipt…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="no-print mx-auto max-w-xl px-4">
        <Link href={`/account/service/${ticketNo}`} className="text-sm font-medium text-[#FF7A19]">Back to request</Link>
      </div>
      <RepairReceiptView
        receipt={receipt}
        onPrint={() => window.print()}
        downloading={downloading}
        onPdf={() => {
          setDownloading(true);
          downloadReceiptPdf(
            `/api/tickets/mine/${encodeURIComponent(ticketNo)}/receipt`,
            `${receipt.ticket_no}-receipt.pdf`
          )
            .catch((error) => toast.error(apiMessage(error, 'Could not download this receipt')))
            .finally(() => setDownloading(false));
        }}
      />
    </div>
  );
}
