'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { QrCode, X } from 'lucide-react';
import { DeviceWarrantyBadge } from '@/components/admin/DeviceWarrantyBadge';
import { OwnerQrCard } from '@/components/devices/OwnerQrCard';
import { useAppSelector } from '@/store';
import { settingsService } from '@/lib/settings.service';
import { apiMessage, deviceRequest, formatDeviceDate, type DeviceWarranty } from '@/lib/devicesAdmin';
import { recordPortalEvent } from '@/lib/portalEvents';

interface MineDevice {
  id?: string;
  status?: string;
  registering?: boolean;
  model_name: string;
  serial_number?: string | null;
  purchase_date?: string;
  warranty?: DeviceWarranty;
  qr_token?: string;
  order_number?: string | null;
}

const FALLBACK_PHONE = '+233 55 134 4310';

export default function MyDevicesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [devices, setDevices] = useState<MineDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDevice, setQrDevice] = useState<MineDevice | null>(null);
  const [phone, setPhone] = useState(FALLBACK_PHONE);

  useEffect(() => {
    let cancelled = false;
    settingsService.getSettingsByCategory('store')
      .then((settings) => {
        if (!cancelled && settings.store_phone) setPhone(settings.store_phone);
      })
      .catch((error) => console.error('store phone', error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=%2Faccount%2Fdevices');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const result = await deviceRequest<MineDevice[]>('/api/devices/mine');
        if (!cancelled) setDevices(result.data || []);
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load your laptops'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-gray-50">
        <p className="text-sm text-[#3A3A3A]">Loading your laptops…</p>
      </div>
    );
  }

  return (
    <div>
        <h1 className="mb-6 hidden text-2xl font-bold text-[#1A1A1A] md:block">My devices</h1>
        {devices.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-[#3A3A3A]">
            No laptops linked yet. Scan the QR sticker on your VENTECH laptop to add it.
          </div>
        ) : (
          <ul className="space-y-3">
            {devices.map((device) => (
              <li key={device.id || `${device.serial_number}-${device.purchase_date}`} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#1A1A1A]">{device.model_name}</p>
                  {device.status === 'pending' || device.registering ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Being prepared
                    </span>
                  ) : null}
                </div>
                {device.status === 'pending' || device.registering ? (
                  <>
                    <p className="mt-2 text-sm text-[#3A3A3A]">
                      Setup, care, and support are already in your laptop portal. Serial number and warranty dates appear once VENTECH registers it.
                    </p>
                    {device.qr_token ? (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Link href={`/d/${encodeURIComponent(device.qr_token)}`} className="inline-flex text-sm font-semibold text-[#FF7A19]">
                          Open laptop portal
                        </Link>
                        <Link
                          href={`/account/service/new?device=${encodeURIComponent(device.qr_token)}`}
                          className="inline-flex text-sm font-semibold text-[#FF7A19]"
                          onClick={() => recordPortalEvent('service_start', { token: device.qr_token })}
                        >
                          Request service
                        </Link>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-mono text-[#3A3A3A] mt-1">{device.serial_number}</p>
                    <p className="text-xs text-[#3A3A3A] mt-1">Purchased {formatDeviceDate(device.purchase_date)}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      {device.warranty ? <DeviceWarrantyBadge warranty={device.warranty} /> : null}
                      {device.qr_token ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#FF7A19] hover:bg-orange-50"
                            aria-label={`My QR code for ${device.serial_number}`}
                            onClick={() => setQrDevice(device)}
                          >
                            <QrCode size={20} />
                          </button>
                          <Link href={`/d/${encodeURIComponent(device.qr_token)}`} className="text-sm font-semibold text-[#FF7A19]">
                            View
                          </Link>
                          <Link
                            href={`/account/service/new?device=${encodeURIComponent(device.qr_token)}`}
                            className="text-sm font-semibold text-[#FF7A19]"
                            onClick={() => recordPortalEvent('service_start', { token: device.qr_token })}
                          >
                            Request service
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

      {qrDevice?.qr_token ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={() => setQrDevice(null)}
        >
          <div className="w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-[#1A1A1A]"
                aria-label="Close QR code"
                onClick={() => setQrDevice(null)}
              >
                <X size={18} />
              </button>
            </div>
            <OwnerQrCard
              qrToken={qrDevice.qr_token}
              modelName={qrDevice.model_name}
              serialNumber={qrDevice.serial_number || ''}
              phone={phone}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
