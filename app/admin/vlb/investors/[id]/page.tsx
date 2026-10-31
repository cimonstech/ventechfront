'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FilePick } from '@/components/ui/FilePick';
import { VlbNav } from '@/components/admin/VlbNav';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs, payoutStatusVariant } from '@/lib/vlb';
import { apiMessage, deviceRequest, openAdminVlbDocument, saveInvestorPayout, uploadVlbDocument } from '@/lib/vlbAdmin';
import { EMPTY_VLB_PAYOUT, payoutPayload, VlbPayoutFields, type VlbPayoutForm } from '@/components/admin/VlbPayoutFields';

interface InvestorDocument {
  id: string;
  title: string;
  kind: string;
  url: string | null;
  investment_id?: string | null;
}

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
    bank_account_name: string | null;
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
    agreement_missing?: boolean;
  }>;
  documents: InvestorDocument[];
}

const KIND_LABEL: Record<string, string> = {
  agreement: 'Agreement',
  receipt: 'Receipt',
  other: 'Other',
};

function fileTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || file.name;
}

function findOnFile(
  documents: InvestorDocument[],
  kind: string,
  investmentId: string,
): InvestorDocument | undefined {
  return documents.find((doc) => {
    if (doc.kind !== kind) return false;
    if (!investmentId) return true;
    return doc.investment_id === investmentId || !doc.investment_id;
  });
}

const CARD = 'min-w-0 overflow-hidden rounded-xl bg-white p-4 shadow-sm sm:p-6';

export default function AdminVlbInvestorDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  useSetAdminHeading('Investor');
  const { canEdit } = useAccess();
  const editable = canEdit('vlb');
  const financeEdit = canEdit('finance');
  const [row, setRow] = useState<InvestorDetail | null>(null);
  const [kind, setKind] = useState('agreement');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [investmentId, setInvestmentId] = useState('');
  const [payoutForm, setPayoutForm] = useState<VlbPayoutForm>(EMPTY_VLB_PAYOUT);
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const formReady = useRef(false);

  const load = () =>
    deviceRequest<InvestorDetail>(`/api/admin/vlb/investors/${id}`).then((result) => {
      setRow(result.data);
      const payout = result.data.payout;
      setPayoutForm({
        payout_method: payout.payout_method === 'bank' ? 'bank' : 'momo',
        momo_network: payout.momo_network || 'MTN',
        momo_number: payout.momo_number || '',
        bank_name: payout.bank_name || '',
        bank_account_name: payout.bank_account_name || '',
        bank_account_number: payout.bank_account_number || '',
      });
      if (!formReady.current) {
        const missing = result.data.investments.find((item) => item.agreement_missing);
        setInvestmentId(missing?.id || result.data.investments[0]?.id || '');
        setKind(missing ? 'agreement' : 'receipt');
        formReady.current = true;
      }
    });

  useEffect(() => {
    if (!id) return;
    load().catch((error) => toast.error(apiMessage(error, 'Could not load this investor.')));
  }, [id]);

  const onFile = findOnFile(row?.documents || [], kind, investmentId);

  const investmentName = useMemo(() => {
    if (!row) return '';
    return row.investments.find((item) => item.id === investmentId)?.plan_name || '';
  }, [row, investmentId]);

  if (!row) return <p className="text-sm text-[#3A3A3A]">Loading investor…</p>;

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim() || (file ? fileTitle(file) : '');
    if (!file || !nextTitle) {
      toast.error('Choose a file and title.');
      return;
    }
    setBusy(true);
    try {
      await uploadVlbDocument(id, file, kind, nextTitle, investmentId || undefined);
      toast.success(onFile ? 'Document replaced.' : 'Document uploaded.');
      setTitle('');
      setFile(null);
      setReplacing(false);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not store this file.'));
    } finally {
      setBusy(false);
    }
  };

  const openDoc = (docId: string) =>
    openAdminVlbDocument(docId).catch((error) => toast.error(apiMessage(error, 'Could not download this file.')));

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <VlbNav current="/admin/vlb/investors" />
      <Link href="/admin/vlb/investors" className="text-sm font-medium text-[#FF7A19]">Back to investors</Link>
      <div className={CARD}>
        <h1 className="break-words text-xl font-bold text-[#1A1A1A]">{row.investor_no || row.name}</h1>
        <p className="break-words text-sm text-[#3A3A3A]">{row.name} · {row.email || '—'} · {row.phone || '—'}</p>
        <p className="mt-3 break-words text-sm text-[#3A3A3A]">
          Payout: {row.payout.payout_method === 'momo'
            ? `${row.payout.momo_network || 'MoMo'} · ${row.payout.momo_number || '—'}`
            : row.payout.payout_method === 'bank'
              ? `${row.payout.bank_name || 'Bank'} · ${row.payout.bank_account_name || ''} · ${row.payout.bank_account_number || '—'}`
              : 'Not set'}
        </p>
      </div>
      {financeEdit && (
        <form
          className={`${CARD} space-y-3`}
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await saveInvestorPayout(id, payoutPayload(payoutForm));
              toast.success('Payout details saved.');
              await load();
            } catch (error) {
              toast.error(apiMessage(error, 'Could not update payout details.'));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="font-semibold text-[#1A1A1A]">Payout details</h2>
          <VlbPayoutFields value={payoutForm} onChange={setPayoutForm} />
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? 'Working...' : 'Save payout details'}
          </Button>
        </form>
      )}
      <section className={CARD}>
        <h2 className="font-semibold text-[#1A1A1A]">Investments</h2>
        <ul className="mt-3 space-y-3">
          {row.investments.map((item) => (
            <li key={item.id} className="min-w-0 rounded-lg border border-gray-100 p-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <Link
                  href={`/admin/vlb/investments/${item.id}`}
                  className="min-w-0 break-words font-medium text-[#FF7A19]"
                >
                  {item.plan_name}
                </Link>
                <span className="flex max-w-full flex-wrap items-center gap-1">
                  {item.agreement_missing ? <Badge variant="error">Agreement missing</Badge> : null}
                  <Badge variant={payoutStatusVariant(item.status)}>{item.status}</Badge>
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-[#3A3A3A]">
                {formatGhs(item.principal_pesewas)} · {formatDeviceDate(item.maturity_date)}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className={CARD}>
        <h2 className="font-semibold text-[#1A1A1A]">Documents</h2>
        {row.documents.length === 0 ? (
          <p className="mt-3 text-sm text-[#3A3A3A]">No files uploaded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {row.documents.map((doc) => (
              <li key={doc.id} className="min-w-0 rounded-lg border border-gray-100 p-3">
                <button
                  type="button"
                  className="block max-w-full break-words text-left font-medium text-[#FF7A19]"
                  onClick={() => openDoc(doc.id)}
                >
                  {doc.title}
                </button>
                <p className="mt-1 text-sm text-[#3A3A3A]">
                  {KIND_LABEL[doc.kind] || doc.kind}
                  {doc.investment_id
                    ? ` · ${row.investments.find((item) => item.id === doc.investment_id)?.plan_name || 'Investment'}`
                    : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <form className="mt-4 grid min-w-0 grid-cols-1 gap-3" onSubmit={upload}>
            <select
              className="min-h-11 w-full min-w-0 max-w-full rounded-lg border px-3 py-2 text-sm"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setReplacing(false);
                setFile(null);
              }}
            >
              <option value="agreement">Agreement</option>
              <option value="receipt">Receipt</option>
              <option value="other">Other</option>
            </select>
            <select
              className="min-h-11 w-full min-w-0 max-w-full rounded-lg border px-3 py-2 text-sm"
              value={investmentId}
              onChange={(e) => {
                setInvestmentId(e.target.value);
                setReplacing(false);
                setFile(null);
              }}
            >
              <option value="">All investments</option>
              {row.investments.map((item) => (
                <option key={item.id} value={item.id}>{item.plan_name}</option>
              ))}
            </select>
            {onFile && !replacing ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {KIND_LABEL[kind] || kind} is already on file
                  {investmentName ? ` for ${investmentName}` : ''}.
                </p>
                <p className="mt-1 break-words text-sm text-[#3A3A3A]">{onFile.title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openDoc(onFile.id)}>
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplacing(true);
                      setTitle(onFile.title);
                    }}
                  >
                    Replace
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {onFile ? (
                  <p className="text-sm text-[#3A3A3A]">
                    Replacing {onFile.title}. Choose a new file, then save.
                  </p>
                ) : null}
                <input
                  className="min-h-11 w-full min-w-0 max-w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <FilePick
                  accept="image/*,application/pdf"
                  file={file}
                  onFile={(next) => {
                    setFile(next);
                    if (next && !title.trim()) setTitle(fileTitle(next));
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy || !file} className="w-full sm:w-auto">
                    {busy ? 'Working...' : onFile ? 'Save replacement' : 'Upload'}
                  </Button>
                  {onFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setReplacing(false);
                        setFile(null);
                        setTitle('');
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
