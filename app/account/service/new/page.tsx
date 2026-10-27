'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { FileText, Film, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DeviceWarrantyBadge } from '@/components/admin/DeviceWarrantyBadge';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { apiMessage, deviceRequest, type DeviceWarranty } from '@/lib/devicesAdmin';
import { uploadTicketFile } from '@/lib/ticketUploads';

interface IssueType {
  id: string;
  name: string;
}

interface MineDevice {
  model_name: string;
  serial_number: string;
  qr_token?: string;
  warranty: DeviceWarranty;
}

interface OwnerDevice {
  view: string;
  model_name: string;
  serial_number?: string;
  warranty: DeviceWarranty;
}

interface LocalFile {
  key: string;
  name: string;
  preview: string;
  progress: number;
  status: 'uploading' | 'ready' | 'error';
  id?: string;
  kind?: string;
  abort?: () => void;
}

function isVideoName(name: string): boolean {
  return /\.(mp4|mov)$/i.test(name);
}

function todayInput(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function NewServiceRequestPage() {
  return (
    <Suspense fallback={<p className="min-h-[50vh] flex items-center justify-center text-sm text-[#3A3A3A]">Loading…</p>}>
      <NewServiceRequest />
    </Suspense>
  );
}

function NewServiceRequest() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceToken = searchParams.get('device')?.trim() || '';
  const returnPath = deviceToken
    ? `/account/service/new?device=${encodeURIComponent(deviceToken)}`
    : '/account/service/new';
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);
  const prefilled = useRef(false);

  const [issues, setIssues] = useState<IssueType[]>([]);
  const [devices, setDevices] = useState<MineDevice[]>([]);
  const [linked, setLinked] = useState<OwnerDevice | null>(null);
  const [source, setSource] = useState<'device' | 'listed' | 'other'>(deviceToken ? 'device' : 'listed');
  const [selectedToken, setSelectedToken] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [issueId, setIssueId] = useState('');
  const [started, setStarted] = useState(todayInput());
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [receipt, setReceipt] = useState<LocalFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = safeRedirectPath(returnPath);
      router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
      return;
    }
    if (!prefilled.current && user) {
      prefilled.current = true;
      const profile = user as { full_name?: string; first_name?: string; last_name?: string; phone?: string };
      const name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ');
      setContactName(name);
      setPhone(profile.phone || '');
    }
    let cancelled = false;
    const load = async () => {
      try {
        const issueResult = await deviceRequest<IssueType[]>('/api/tickets/issue-types');
        if (cancelled) return;
        setIssues(issueResult.data || []);
        let showList = !deviceToken;
        if (deviceToken) {
          try {
            const deviceResult = await deviceRequest<OwnerDevice>(`/api/devices/public/${encodeURIComponent(deviceToken)}`);
            if (cancelled) return;
            if (deviceResult.data?.view === 'owner' && deviceResult.data.warranty) {
              setLinked(deviceResult.data);
            } else {
              toast.error('Device not found.');
              setSource('listed');
              showList = true;
            }
          } catch (error) {
            if (!cancelled) toast.error(apiMessage(error, 'Device not found.'));
            setSource('listed');
            showList = true;
          }
        }
        if (showList) {
          const mine = await deviceRequest<MineDevice[]>('/api/devices/mine');
          if (!cancelled) setDevices((mine.data || []).filter((device) => device.qr_token));
        }
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load this form'));
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [deviceToken, isAuthenticated, isLoading, returnPath, router, user]);

  const busy = files.some((file) => file.status === 'uploading') || receipt?.status === 'uploading';
  const attachedCount = files.filter((file) => file.status !== 'error').length + (receipt && receipt.status !== 'error' ? 1 : 0);

  const startUpload = (file: File, kind?: 'receipt') => {
    const key = `${file.name}-${file.size}-${Date.now()}`;
    const visual = file.type.startsWith('image/') || file.type.startsWith('video/') || /\.(jpe?g|png|webp|heic|heif|mp4|mov)$/i.test(file.name);
    const preview = visual ? URL.createObjectURL(file) : '';
    const local: LocalFile = { key, name: file.name, preview, progress: 0, status: 'uploading' };
    const upload = uploadTicketFile(file, {
      kind,
      onProgress: (percent) => {
        const apply = (row: LocalFile) => row.key === key ? { ...row, progress: percent } : row;
        if (kind === 'receipt') setReceipt((current) => current && current.key === key ? { ...current, progress: percent } : current);
        else setFiles((current) => current.map(apply));
      },
    });
    local.abort = upload.abort;
    if (kind === 'receipt') setReceipt(local);
    else setFiles((current) => [...current, local]);
    upload.promise
      .then((uploaded) => {
        const done: Partial<LocalFile> = {
          status: 'ready',
          id: uploaded.id,
          kind: uploaded.kind,
          progress: 100,
          preview: preview || (uploaded.kind === 'image' ? uploaded.previewUrl : ''),
        };
        if (kind === 'receipt') {
          setReceipt((current) => current && current.key === key ? { ...current, ...done } : current);
        } else {
          setFiles((current) => current.map((row) => row.key === key ? { ...row, ...done } : row));
        }
        toast.success(uploaded.message);
      })
      .catch((error) => {
        if (kind === 'receipt') setReceipt((current) => current && current.key === key ? { ...current, status: 'error', progress: 0 } : current);
        else setFiles((current) => current.map((row) => row.key === key ? { ...row, status: 'error', progress: 0 } : row));
        toast.error(apiMessage(error, 'Could not store this file'));
      });
  };

  const addFiles = (list: FileList | null) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    let videos = files.filter((file) => file.status !== 'error' && (file.kind === 'video' || (file.status === 'uploading' && isVideoName(file.name)))).length;
    let room = 5 - attachedCount;
    for (const file of incoming) {
      const video = isVideoName(file.name) || file.type === 'video/mp4' || file.type === 'video/quicktime';
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        toast.error('PDF files can only be uploaded as a receipt.');
        continue;
      }
      if (video && file.size > 50 * 1024 * 1024) {
        toast.error('Videos must be 50 MB or smaller.');
        continue;
      }
      if (!video && file.size > 10 * 1024 * 1024) {
        toast.error('Images must be 10 MB or smaller.');
        continue;
      }
      if (room <= 0) {
        toast.error('You can attach up to 5 files.');
        break;
      }
      if (video && videos >= 1) {
        toast.error('Only one video can be attached.');
        continue;
      }
      if (video) videos += 1;
      room -= 1;
      startUpload(file);
    }
  };

  const removeFile = async (row: LocalFile, kind?: 'receipt') => {
    row.abort?.();
    if (row.preview.startsWith('blob:')) URL.revokeObjectURL(row.preview);
    if (kind === 'receipt') setReceipt(null);
    else setFiles((current) => current.filter((file) => file.key !== row.key));
    if (!row.id) return;
    try {
      const result = await deviceRequest(`/api/tickets/uploads/${row.id}`, { method: 'DELETE' });
      toast.success(result.message);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete this file'));
    }
  };

  const addReceipt = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    if (receipt?.status === 'uploading' || receipt?.status === 'ready') {
      toast.error('Remove the current receipt first.');
      return;
    }
    if (attachedCount >= 5) {
      toast.error('You can attach up to 5 files.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Receipts must be 10 MB or smaller.');
      return;
    }
    startUpload(file, 'receipt');
  };

  const submit = async () => {
    if (busy) return;
    const descriptionText = description.trim();
    if (descriptionText.length < 20) {
      toast.error('Describe the problem in at least 20 characters.');
      return;
    }
    if (descriptionText.length > 3000) {
      toast.error('Description must be 3000 characters or less.');
      return;
    }
    if (!issueId) {
      toast.error('Choose an issue type.');
      return;
    }
    if (started > todayInput()) {
      toast.error('The start date cannot be in the future.');
      return;
    }
    if (!contactName.trim() || !phone.trim()) {
      toast.error('Check the form and try again.');
      return;
    }
    const token = source === 'device' ? deviceToken : source === 'listed' ? selectedToken : '';
    if (source === 'listed' && !token) {
      toast.error('Choose a laptop.');
      return;
    }
    if (source === 'other' && !model.trim()) {
      toast.error('Enter the laptop model.');
      return;
    }
    const mediaIds = [
      ...files.filter((file) => file.status === 'ready' && file.id).map((file) => file.id as string),
      ...(receipt?.status === 'ready' && receipt.id ? [receipt.id] : []),
    ];
    const hasReceipt = receipt?.status === 'ready' && receipt.kind === 'receipt';
    if (source === 'other' && !orderNumber.trim() && !hasReceipt) {
      toast.error('Add an order number or a receipt.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await deviceRequest<{ ticket_no: string }>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          device_token: token || undefined,
          laptop_model: source === 'other' ? model.trim() : undefined,
          serial_number: source === 'other' && serial.trim() ? serial.trim() : undefined,
          order_number: source === 'other' && orderNumber.trim() ? orderNumber.trim() : undefined,
          issue_type_id: issueId,
          contact_name: contactName.trim(),
          contact_phone: phone.trim(),
          date_started: started,
          description: descriptionText,
          media_ids: mediaIds,
        }),
      });
      toast.success(result.message);
      setCreated(result.data.ticket_no);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not submit this request'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated || !ready) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-[#3A3A3A]">Loading…</p>
      </div>
    );
  }

  if (created) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-4">
          <p className="text-sm font-semibold text-[#3A3A3A]">Service request</p>
          <p className="text-3xl font-bold text-[#1A1A1A] break-all">{created}</p>
          <p className="text-sm text-[#1A1A1A]">We&apos;ve emailed you a copy</p>
          <div className="flex flex-col gap-3">
            <Link href={`/account/service/${encodeURIComponent(created)}`} className="inline-flex items-center justify-center rounded-lg bg-[#FF7A19] px-4 py-2 font-medium text-white">
              View request
            </Link>
            <Link href="/account/devices" className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 font-medium text-[#1A1A1A]">
              Back to my devices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const showOther = source === 'other';
  const listed = devices;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <form
        className="max-w-lg mx-auto space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Request service</h1>

        {source === 'device' && linked && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-[#1A1A1A]">{linked.model_name}</p>
            <p className="text-sm font-mono text-[#3A3A3A]">{linked.serial_number || '—'}</p>
            <DeviceWarrantyBadge warranty={linked.warranty} />
          </section>
        )}

        {source !== 'device' && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-[#1A1A1A]">Which laptop?</p>
            {listed.map((device) => (
              <label key={device.qr_token} className="flex items-start gap-3 text-sm">
                <input
                  type="radio"
                  name="laptop"
                  checked={source === 'listed' && selectedToken === device.qr_token}
                  onChange={() => {
                    setSource('listed');
                    setSelectedToken(device.qr_token || '');
                  }}
                />
                <span>
                  <span className="block font-medium text-[#1A1A1A]">{device.model_name}</span>
                  <span className="block font-mono text-[#3A3A3A]">{device.serial_number}</span>
                </span>
              </label>
            ))}
            <label className="flex items-center gap-3 text-sm font-medium text-[#1A1A1A]">
              <input
                type="radio"
                name="laptop"
                checked={showOther}
                onChange={() => {
                  setSource('other');
                  setSelectedToken('');
                }}
              />
              A laptop not listed here
            </label>
            {showOther && (
              <div className="space-y-3 pt-2">
                <label className="block text-sm">
                  <span className="font-medium text-[#1A1A1A]">Laptop model</span>
                  <input value={model} onChange={(event) => setModel(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[#1A1A1A]">Serial (optional)</span>
                  <input value={serial} onChange={(event) => setSerial(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-[#1A1A1A]">Order number (optional)</span>
                  <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </label>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#1A1A1A]">Receipt</p>
                  {!receipt && (
                    <DropZone
                      accept="image/*,.pdf,application/pdf"
                      title="Add a receipt"
                      hint="A photo or PDF, up to 10 MB"
                      onFiles={addReceipt}
                    />
                  )}
                  {receipt && <FileTile row={receipt} onRemove={() => void removeFile(receipt, 'receipt')} />}
                </div>
              </div>
            )}
          </section>
        )}

        <label className="block text-sm bg-white border border-gray-200 rounded-xl p-4">
          <span className="font-medium text-[#1A1A1A]">Issue</span>
          <select value={issueId} onChange={(event) => setIssueId(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">Choose an issue</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>{issue.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm bg-white border border-gray-200 rounded-xl p-4">
          <span className="font-medium text-[#1A1A1A]">Date the problem started</span>
          <input type="date" value={started} max={todayInput()} onChange={(event) => setStarted(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </label>

        <label className="block text-sm bg-white border border-gray-200 rounded-xl p-4">
          <span className="font-medium text-[#1A1A1A]">Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={3000} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          <span className={`mt-1 block text-xs ${description.trim().length > 0 && description.trim().length < 20 ? 'text-red-600' : 'text-[#3A3A3A]'}`}>
            {description.length} / 3000 · 20 to 3000 characters
          </span>
        </label>

        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[#1A1A1A]">Contact name</span>
            <input value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1A1A1A]">Phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </label>
        </div>

        <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#1A1A1A]">Photos and video</h2>
              <p className="text-xs text-[#3A3A3A] mt-1">{files.filter((file) => file.status !== 'error').length} of 5</p>
            </div>
          </div>
          <DropZone
            multiple
            full={attachedCount >= 5}
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            title={attachedCount >= 5 ? '5 files added' : 'Add photos or a video'}
            hint={attachedCount >= 5 ? 'Remove one to add another' : 'Tap to choose, or drop files here'}
            onFiles={(list) => {
              if (attachedCount >= 5) {
                toast.error('You can attach up to 5 files.');
                return;
              }
              addFiles(list);
            }}
          />
          <p className="text-xs leading-relaxed text-[#3A3A3A]">Photos up to 10 MB each (JPG, PNG, WebP, HEIC). One video up to 50 MB (MP4 or MOV).</p>
          {files.length > 0 && (
            <ul className="grid grid-cols-2 gap-3">
              {files.map((file) => (
                <li key={file.key}>
                  <FileTile row={file} onRemove={() => void removeFile(file)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <Button type="submit" className="w-full" disabled={busy || submitting} isLoading={submitting}>
          Submit request
        </Button>
      </form>
    </div>
  );
}

function DropZone({
  accept,
  title,
  hint,
  onFiles,
  multiple,
  full,
}: {
  accept: string;
  title: string;
  hint: string;
  onFiles: (list: FileList | null) => void;
  multiple?: boolean;
  full?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!full) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (full) {
          onFiles(null);
          return;
        }
        onFiles(event.dataTransfer.files);
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (full) {
            onFiles(null);
            return;
          }
          inputRef.current?.click();
        }}
        className={`w-full rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] focus-visible:ring-offset-2 active:bg-orange-100 ${
          full
            ? 'border-gray-200 bg-gray-50 text-[#3A3A3A]'
            : over
              ? 'border-[#FF7A19] bg-orange-50'
              : 'border-gray-300 bg-[#FFF8F3] hover:border-[#FF7A19] hover:bg-orange-50'
        }`}
      >
        <span className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${full ? 'bg-gray-200 text-[#3A3A3A]' : 'bg-white text-[#FF7A19] shadow-sm'}`}>
          <ImagePlus size={22} aria-hidden />
        </span>
        <span className="block font-semibold text-[#1A1A1A]">{title}</span>
        <span className="mt-1 block text-xs text-[#3A3A3A]">{hint}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function FileTile({ row, onRemove }: { row: LocalFile; onRemove: () => void }) {
  const video = row.kind === 'video' || isVideoName(row.name);
  return (
    <figure className="min-w-0">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 ${row.status === 'error' ? 'ring-2 ring-red-500' : ''}`}>
        {video && row.preview ? (
          <video src={row.preview} muted className="h-full w-full object-cover" />
        ) : row.preview ? (
          <img src={row.preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-[#3A3A3A]">
            {video ? <Film size={22} aria-hidden /> : <FileText size={22} aria-hidden />}
            <span className="text-[10px] font-semibold">{video ? 'Video' : 'File'}</span>
          </div>
        )}
        {video && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">Video</span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${row.name}`}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1A1A1A] shadow-sm hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
        >
          <X size={14} aria-hidden />
        </button>
        {row.status === 'uploading' && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
              <div className="h-full bg-[#FF7A19]" style={{ width: `${row.progress}%` }} />
            </div>
            <p className="mt-1 text-[10px] font-medium text-white">{row.progress}%</p>
          </div>
        )}
        {row.status === 'error' && (
          <div className="absolute inset-x-0 bottom-0 bg-red-700/90 px-2 py-2">
            <p className="text-[11px] font-semibold text-white">Could not store this file</p>
          </div>
        )}
      </div>
      <figcaption className="mt-1 truncate text-xs text-[#3A3A3A]">{row.name}</figcaption>
    </figure>
  );
}
