'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { apiMessage, deviceRequest, uploadVlbDocument } from '@/lib/vlbAdmin';

interface InvestorDetail {
  id: string;
  investor_no: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  payout: {
    payout_method: string | null;
    momo_network: string | null;
    momo_number: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
  };
  investments: Array<{
    id: string;
    plan_name: string;
    principal_pesewas: number;
    start_date: string;
    maturity_date: string;
    status: string;
    current_term: number;
  }>;
  documents: Array<{ id: string; title: string; kind: string; url: string | null }>;
}

export default function AdminVlbInvestorDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  useSetAdminHeading('Investor');
  const { canEdit } = useAccess();
  const editable = canEdit('vlb');
  const [row, setRow] = useState<InvestorDetail | null>(null);
  const [kind, setKind] = useState('agreement');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    deviceRequest<InvestorDetail>(`/api/admin/vlb/investors/${id}`).then((result) => setRow(result.data));

  useEffect(() => {
    if (!id) return;
    load().catch((error) => toast.error(apiMessage(error, 'Could not load this investor.')));
  }, [id]);

  if (!row) return <p className="text-sm text-[#3A3A3A]">Loading investor…</p>;

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !title.trim()) {
      toast.error('Choose a file and title.');
      return;
    }
    setBusy(true);
    try {
      await uploadVlbDocument(id, file, kind, title.trim());
      toast.success('Document uploaded.');
      setTitle('');
      setFile(null);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not store this file.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <VlbNav current="/admin/vlb/investors" />
      <Link href="/admin/vlb/investors" className="text-sm font-medium text-[#FF7A19]">Back to investors</Link>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#1A1A1A]">{row.investor_no || row.name}</h1>
        <p className="text-sm text-[#3A3A3A]">{row.name} · {row.email || '—'} · {row.phone || '—'}</p>
        <p className="mt-3 text-sm text-[#3A3A3A]">
          Payout: {row.payout.payout_method === 'momo'
            ? `${row.payout.momo_network || 'MoMo'} · ${row.payout.momo_number || '—'}`
            : row.payout.payout_method === 'bank'
              ? `${row.payout.bank_name || 'Bank'} · ${row.payout.bank_account_number || '—'}`
              : 'Not set'}
        </p>
      </div>
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#1A1A1A]">Investments</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {row.investments.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <Link href={`/admin/vlb/investments/${item.id}`} className="font-medium text-[#FF7A19]">{item.plan_name}</Link>
              <span className="text-[#3A3A3A]">{formatGhs(item.principal_pesewas)} · {formatDeviceDate(item.maturity_date)}</span>
              <Badge variant={payoutStatusVariant(item.status)}>{item.status}</Badge>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#1A1A1A]">Documents</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {row.documents.map((doc) => (
            <li key={doc.id}>
              {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer" className="text-[#FF7A19]">{doc.title}</a> : doc.title}
              <span className="ml-2 text-[#3A3A3A]">{doc.kind}</span>
            </li>
          ))}
        </ul>
        {editable && (
          <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={upload}>
            <select className="rounded-lg border px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="agreement">Agreement</option>
              <option value="receipt">Receipt</option>
              <option value="statement">Statement</option>
              <option value="other">Other</option>
            </select>
            <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button type="submit" disabled={busy}>Upload</Button>
          </form>
        )}
      </section>
    </div>
  );
}
