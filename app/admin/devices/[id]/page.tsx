'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { DeviceWarrantyBadge } from '@/components/admin/DeviceWarrantyBadge';
import { useSetAdminHeading } from '@/components/admin/AdminHeading';
import { useAccess } from '@/context/AccessContext';
import { downloadBlob, qrDataUrl, qrSvg, safeFileName } from '@/lib/deviceQr';
import {
  DeviceRecord,
  DeviceStatus,
  apiMessage,
  devicePublicUrl,
  deviceRequest,
  formatDeviceDate,
} from '@/lib/devicesAdmin';

const fieldClass = 'mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] disabled:bg-gray-50';

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { canEdit } = useAccess();
  const editable = canEdit('devices');
  const [device, setDevice] = useState<DeviceRecord | null>(null);
  const [serial, setSerial] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [warrantyStart, setWarrantyStart] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DeviceStatus>('active');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  const apply = (row: DeviceRecord) => {
    setDevice(row);
    setSerial(row.serial_number || '');
    setWarrantyMonths(String(row.warranty_months ?? 0));
    setWarrantyStart((row.warranty_start || '').slice(0, 10));
    setNotes(row.notes || '');
    setStatus(row.status);
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await deviceRequest<DeviceRecord>(`/api/admin/devices/${id}`);
        if (!cancelled) apply(result.data);
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          toast.error(apiMessage(error, 'Could not load this device'));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const publicUrl = device ? devicePublicUrl(device.qr_token) : '';
  useSetAdminHeading(
    device ? `${device.model_name} · ${device.serial_number}` : 'Device',
    id || null
  );

  useEffect(() => {
    if (!publicUrl) {
      setQrImage('');
      return;
    }
    let cancelled = false;
    qrDataUrl(publicUrl, 280)
      .then((url) => {
        if (!cancelled) setQrImage(url);
      })
      .catch((error) => {
        if (!cancelled) toast.error(apiMessage(error, 'Could not draw the QR code'));
      });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const save = async () => {
    const months = Number(warrantyMonths);
    if (!Number.isInteger(months) || months < 0 || months > 120) {
      toast.error('Warranty months must be between 0 and 120');
      return;
    }
    if (!serial.trim()) {
      toast.error('Enter a serial number');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(warrantyStart)) {
      toast.error('Enter a warranty start date');
      return;
    }
    setSaving(true);
    try {
      const result = await deviceRequest<DeviceRecord>(`/api/admin/devices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          serial_number: serial.trim(),
          warranty_months: months,
          warranty_start: warrantyStart,
          notes: notes.trim() ? notes.trim() : null,
          status,
        }),
      });
      apply(result.data);
      toast.success(result.message);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update this device'));
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!window.confirm('The old sticker will stop working')) return;
    setWorking(true);
    try {
      const result = await deviceRequest<DeviceRecord>(`/api/admin/devices/${id}/regenerate-token`, { method: 'POST' });
      apply(result.data);
      toast.success(result.message);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not regenerate the QR code'));
    } finally {
      setWorking(false);
    }
  };

  const linkOwner = async () => {
    if (!ownerEmail.trim()) {
      toast.error('Enter an email address');
      return;
    }
    setWorking(true);
    try {
      const result = await deviceRequest<DeviceRecord>(`/api/admin/devices/${id}/link-owner`, {
        method: 'POST',
        body: JSON.stringify({ email: ownerEmail.trim() }),
      });
      apply(result.data);
      setOwnerEmail('');
      toast.success(result.message);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not link the owner'));
    } finally {
      setWorking(false);
    }
  };

  const unlinkOwner = async () => {
    setWorking(true);
    try {
      const result = await deviceRequest<DeviceRecord>(`/api/admin/devices/${id}/unlink-owner`, { method: 'POST' });
      apply(result.data);
      toast.success(result.message);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not unlink the owner'));
    } finally {
      setWorking(false);
    }
  };

  const downloadPng = async () => {
    if (!publicUrl || !device) return;
    try {
      const dataUrl = await qrDataUrl(publicUrl, 512);
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(`${safeFileName(device.serial_number)}.png`, blob);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not download the PNG'));
    }
  };

  const downloadSvg = async () => {
    if (!publicUrl || !device) return;
    try {
      const svg = await qrSvg(publicUrl);
      downloadBlob(`${safeFileName(device.serial_number)}.svg`, new Blob([svg], { type: 'image/svg+xml' }));
    } catch (error) {
      toast.error(apiMessage(error, 'Could not download the SVG'));
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link copied');
    } catch (error) {
      toast.error(apiMessage(error, 'Could not copy the link'));
    }
  };

  if (!device) {
    return (
      <p className="text-sm text-[#3A3A3A]">
        {failed ? 'Could not load this device.' : 'Loading device…'}
      </p>
    );
  }

  const orderId = device.order?.id || device.order_id;
  const orderNumber = device.order?.order_number || device.order_number;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/devices" className="text-sm text-[#FF7A19] font-medium">Back to devices</Link>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnly label="Model" value={device.model_name} />
            <label className="block text-sm">
              <span className="font-semibold text-[#1A1A1A]">Serial</span>
              <input className={fieldClass} value={serial} disabled={!editable} onChange={(event) => setSerial(event.target.value)} />
            </label>
            {ownersDiffer(device) ? (
              <>
                <div className="md:col-span-2 rounded-lg border border-gray-200 p-4 space-y-3">
                  <p className="font-semibold text-[#1A1A1A]">Original buyer</p>
                  <ReadOnly label="Name" value={device.customer_name || '—'} />
                  <ReadOnly label="Email" value={device.customer_email || '—'} />
                  <ReadOnly label="Phone" value={device.customer_phone || '—'} />
                  <OrderLink orderId={orderId} orderNumber={orderNumber} />
                </div>
                <div className="md:col-span-2 rounded-lg border border-gray-200 p-4 space-y-3">
                  <p className="font-semibold text-[#1A1A1A]">Current owner</p>
                  <ReadOnly label="Name" value={device.owner?.full_name || '—'} />
                  <ReadOnly label="Email" value={device.owner?.email || '—'} />
                  <ReadOnly label="Linked on" value={formatDeviceDate(device.owner_linked_at) || '—'} />
                </div>
              </>
            ) : (
              <>
                <ReadOnly label="Customer" value={device.customer_name || '—'} />
                <ReadOnly label="Email" value={device.customer_email || '—'} />
                <ReadOnly label="Phone" value={device.customer_phone || '—'} />
                <OrderLink orderId={orderId} orderNumber={orderNumber} />
              </>
            )}
            <ReadOnly label="Purchase date" value={formatDeviceDate(device.purchase_date) || '—'} />
            <div className="text-sm">
              <p className="font-semibold text-[#1A1A1A]">Warranty</p>
              <div className="mt-1"><DeviceWarrantyBadge warranty={device.warranty} /></div>
            </div>
            <label className="block text-sm">
              <span className="font-semibold text-[#1A1A1A]">Warranty months</span>
              <input
                type="number"
                min={0}
                max={120}
                className={fieldClass}
                value={warrantyMonths}
                disabled={!editable}
                onChange={(event) => setWarrantyMonths(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-[#1A1A1A]">Warranty start</span>
              <input type="date" className={fieldClass} value={warrantyStart} disabled={!editable} onChange={(event) => setWarrantyStart(event.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-[#1A1A1A]">Status</span>
              <select className={fieldClass} value={status} disabled={!editable} onChange={(event) => setStatus(event.target.value as DeviceStatus)}>
                <option value="active">Active</option>
                <option value="transferred">Transferred</option>
                <option value="retired">Retired</option>
              </select>
            </label>
            {!ownersDiffer(device) && (
              <ReadOnly
                label="Linked owner"
                value={device.owner ? `${device.owner.full_name || 'Account'} · ${device.owner.email || ''}` : 'Not linked'}
              />
            )}
          </div>
          <label className="block text-sm">
            <span className="font-semibold text-[#1A1A1A]">Notes</span>
            <textarea
              className={fieldClass}
              rows={4}
              value={notes}
              disabled={!editable}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          {editable && <Button onClick={save} isLoading={saving}>Save changes</Button>}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
          <p className="font-semibold text-[#1A1A1A]">QR code</p>
          {publicUrl && qrImage ? (
            <img src={qrImage} alt="Device QR code" className="w-full h-auto border border-gray-200 rounded-lg" />
          ) : (
            <p className="text-sm text-[#3A3A3A]">Set NEXT_PUBLIC_SITE_URL to generate the QR link.</p>
          )}
          {publicUrl && <p className="text-xs break-all text-[#3A3A3A]">{publicUrl}</p>}
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" disabled={!publicUrl} onClick={downloadPng}>Download PNG</Button>
            <Button variant="outline" size="sm" disabled={!publicUrl} onClick={downloadSvg}>Download SVG</Button>
            <Button variant="outline" size="sm" disabled={!publicUrl} onClick={copyLink}>Copy link</Button>
            {editable && (
              <Button variant="secondary" size="sm" isLoading={working} onClick={regenerate}>Regenerate QR</Button>
            )}
          </div>
          {editable && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <label className="block text-sm">
                <span className="font-semibold text-[#1A1A1A]">Link owner by email</span>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  className={fieldClass}
                  placeholder="customer@example.com"
                />
              </label>
              <Button size="sm" variant="outline" isLoading={working} onClick={linkOwner}>Link owner</Button>
              {device.user_id && (
                <Button size="sm" variant="ghost" isLoading={working} onClick={unlinkOwner}>Unlink owner</Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ownersDiffer(device: DeviceRecord): boolean {
  if (!device.user_id || !device.owner) return false;
  if (device.order?.user_id && device.order.user_id === device.user_id) return false;
  const ownerEmail = (device.owner.email || '').trim().toLowerCase();
  const buyerEmail = (device.customer_email || '').trim().toLowerCase();
  if (ownerEmail && buyerEmail && ownerEmail === buyerEmail) return false;
  return true;
}

function OrderLink({ orderId, orderNumber }: { orderId: string | null; orderNumber: string | null }) {
  return (
    <div className="text-sm">
      <p className="font-semibold text-[#1A1A1A]">Order</p>
      {orderId && orderNumber ? (
        <Link href={`/admin/orders?open=${orderId}`} className="text-[#FF7A19] font-medium">{orderNumber}</Link>
      ) : (
        <p className="text-[#3A3A3A]">{orderNumber || '—'}</p>
      )}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <p className="font-semibold text-[#1A1A1A]">{label}</p>
      <p className="mt-1 text-[#3A3A3A]">{value}</p>
    </div>
  );
}
