'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { settingsService } from '@/lib/settings.service';
import { qrDataUrl } from '@/lib/deviceQr';
import { DeviceRecord, apiMessage, devicePublicUrl, deviceRequest } from '@/lib/devicesAdmin';

const FALLBACK_PHONE = '+233 55 134 4310';

export default function DeviceLabelsPage() {
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState(FALLBACK_PHONE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadPhone = async () => {
      try {
        const settings = await settingsService.getSettingsByCategory('store');
        if (!cancelled && settings.store_phone) setPhone(settings.store_phone);
      } catch (error) {
        console.error('store phone', error);
      }
    };
    void loadPhone();
    return () => {
      cancelled = true;
    };
  }, []);

  const remember = (rows: DeviceRecord[]) => {
    setDevices(rows);
    setPicked(rows.map((row) => row.id));
  };

  const loadIds = async (ids: string[]) => {
    const results = await Promise.all(ids.map(async (id) => {
      const result = await deviceRequest<DeviceRecord>(`/api/admin/devices/${id}`);
      return result.data;
    }));
    remember(results.filter(Boolean));
  };

  const loadOrder = async (number: string) => {
    const collected: DeviceRecord[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages && page <= 10) {
      const result = await deviceRequest<DeviceRecord[]>(
        `/api/admin/devices?search=${encodeURIComponent(number)}&limit=100&page=${page}`
      );
      collected.push(...(result.data || []).filter((row) => row.order_number === number));
      totalPages = result.pagination?.totalPages || 1;
      page += 1;
    }
    remember(collected);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = (params.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean);
    const order = params.get('order') || '';
    if (order) setOrderNumber(order);
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (ids.length > 0) await loadIds(ids);
        else if (order) await loadOrder(order);
        else if (!cancelled) remember([]);
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load labels'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      const next: Record<string, string> = {};
      await Promise.all(devices.filter((device) => picked.includes(device.id)).map(async (device) => {
        const url = devicePublicUrl(device.qr_token);
        if (!url) return;
        next[device.id] = await qrDataUrl(url, 256);
      }));
      if (!cancelled) setImages(next);
    };
    void draw().catch((error) => toast.error(apiMessage(error, 'Could not draw the QR codes')));
    return () => {
      cancelled = true;
    };
  }, [devices, picked]);

  const searchOrder = async () => {
    const number = orderNumber.trim();
    if (!number) {
      toast.error('Enter an order number');
      return;
    }
    setLoading(true);
    try {
      await loadOrder(number);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load that order'));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const labels = devices.filter((device) => picked.includes(device.id));

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          .label-sheet {
            display: grid !important;
            grid-template-columns: repeat(3, 64mm) !important;
            grid-auto-rows: 35mm !important;
            gap: 0 !important;
          }
          .label-card {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 0.2mm solid #ccc;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="space-y-4 print:hidden mb-6">
        <Link href="/admin/devices" className="text-sm text-[#FF7A19] font-medium">Back to devices</Link>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
          <input
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="Order number"
            className="flex-1 min-w-[220px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
          <Button variant="outline" onClick={searchOrder}>Load order</Button>
          <Button onClick={() => window.print()} disabled={labels.length === 0}>Print</Button>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          {loading ? (
            <p className="text-sm text-[#3A3A3A]">Loading devices…</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-[#3A3A3A]">Choose devices from the list, or load every device on an order.</p>
          ) : devices.map((device) => (
            <label key={device.id} className="flex items-center gap-3 text-sm text-[#1A1A1A]">
              <input type="checkbox" checked={picked.includes(device.id)} onChange={() => toggle(device.id)} />
              <span className="font-mono">{device.serial_number}</span>
              <span>{device.model_name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="label-sheet grid grid-cols-3 gap-3">
        {labels.map((device) => (
          <article key={device.id} className="label-card bg-white border border-gray-300 rounded-md p-2 flex gap-2 items-center overflow-hidden h-[148px] print:h-auto print:rounded-none">
            {images[device.id] ? (
              <img src={images[device.id]} alt="" className="w-16 h-16 print:w-[22mm] print:h-[22mm] object-contain shrink-0" />
            ) : (
              <div className="w-16 h-16 shrink-0 bg-gray-100" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wide text-[#1A1A1A]">VENTECH</p>
              <p className="text-xs text-[#1A1A1A] truncate">{device.model_name}</p>
              <p className="text-[11px] font-mono text-[#1A1A1A] truncate">{device.serial_number}</p>
              <p className="text-[11px] text-[#3A3A3A] truncate">{phone}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
