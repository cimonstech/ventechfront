'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DeviceWarrantyBadge } from '@/components/admin/DeviceWarrantyBadge';
import { useAccess } from '@/context/AccessContext';
import {
  DeviceRecord,
  DeviceStatus,
  WarrantyStatus,
  apiMessage,
  deviceRequest,
} from '@/lib/devicesAdmin';

const STATUS_LABEL: Record<DeviceStatus, string> = {
  pending: 'Awaiting serial',
  active: 'Active',
  transferred: 'Transferred',
  retired: 'Retired',
};

export default function AdminDevicesPage() {
  const router = useRouter();
  const { canEdit } = useAccess();
  const editable = canEdit('devices');
  const [rows, setRows] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | DeviceStatus>('');
  const [warranty, setWarranty] = useState<'' | Exclude<WarrantyStatus, 'none'>>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [serialDrafts, setSerialDrafts] = useState<Record<string, string>>({});
  const [warrantyDrafts, setWarrantyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const order = new URLSearchParams(window.location.search).get('order') || '';
    if (order) {
      setSearchInput(order);
      setSearch(order);
    }
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, bootstrapped]);

  useEffect(() => {
    if (!bootstrapped) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (warranty) params.set('warranty', warranty);
        const result = await deviceRequest<DeviceRecord[]>(`/api/admin/devices?${params.toString()}`);
        if (cancelled) return;
        setRows(result.data || []);
        setTotal(result.pagination?.total || 0);
        setTotalPages(result.pagination?.totalPages || 1);
        if (typeof result.pending_count === 'number') setPendingCount(result.pending_count);
        const serials: Record<string, string> = {};
        const warranties: Record<string, string> = {};
        for (const row of result.data || []) {
          if (row.status === 'pending') {
            serials[row.id] = '';
            warranties[row.id] = row.warranty_months ? String(row.warranty_months) : '';
          }
        }
        setSerialDrafts(serials);
        setWarrantyDrafts(warranties);
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load devices'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, search, status, warranty, page, reloadToken]);

  const pageIds = rows.map((row) => row.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const toggle = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const togglePage = () => {
    setSelected((current) => {
      if (allOnPage) return current.filter((id) => !pageIds.includes(id));
      return [...new Set([...current, ...pageIds])];
    });
  };

  const printLabels = () => {
    if (selected.length === 0) {
      router.push('/admin/devices/labels');
      return;
    }
    router.push(`/admin/devices/labels?ids=${selected.join(',')}`);
  };

  const savePending = async (device: DeviceRecord) => {
    const serial = (serialDrafts[device.id] || '').trim();
    if (!serial) {
      toast.error('Enter a serial number');
      return;
    }
    const warrantyEditable = device.product?.warranty_months == null;
    const monthsRaw = warrantyDrafts[device.id];
    let warrantyMonths: number | undefined;
    if (warrantyEditable && monthsRaw !== undefined && monthsRaw.trim() !== '') {
      const months = Number(monthsRaw);
      if (!Number.isInteger(months) || months < 0 || months > 120) {
        toast.error('Warranty months must be between 0 and 120');
        return;
      }
      warrantyMonths = months;
    }
    setSavingId(device.id);
    try {
      await deviceRequest(`/api/admin/devices/${device.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          serial_number: serial,
          ...(warrantyMonths === undefined ? {} : { warranty_months: warrantyMonths }),
        }),
      });
      toast.success('Laptop registered.');
      setReloadToken((current) => current + 1);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save this serial'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#3A3A3A]">{total} device{total === 1 ? '' : 's'}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={printLabels}>Print labels</Button>
          {editable && (
            <Button onClick={() => router.push('/admin/devices/new')}>Add from Orders</Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search serial, customer, order, or model"
          className="min-h-11 w-full min-w-0 flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] sm:min-w-[220px]"
        />
        <div className="flex flex-wrap gap-2">
          {([
            { value: 'pending' as const, label: 'Awaiting serial', count: pendingCount },
            { value: '' as const, label: 'All' },
            { value: 'active' as const, label: 'Active' },
            { value: 'transferred' as const, label: 'Transferred' },
            { value: 'retired' as const, label: 'Retired' },
          ]).map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`min-h-11 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                status === tab.value ? 'bg-[#1A1A1A] text-white' : 'bg-gray-100 text-[#1A1A1A]'
              }`}
            >
              {tab.label}
              {tab.count ? (
                <span className={`rounded-full px-2 py-0.5 text-xs ${status === tab.value ? 'bg-white text-[#1A1A1A]' : 'bg-[#FF7A19] text-white'}`}>
                  {tab.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <select
          value={warranty}
          onChange={(event) => {
            setWarranty(event.target.value as '' | 'active' | 'expired');
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
        >
          <option value="">All warranties</option>
          <option value="active">Warranty active</option>
          <option value="expired">Warranty expired</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto sticky-first">
        <table className="w-full min-w-[880px]">
          <thead className="bg-gray-50 text-left text-sm text-[#1A1A1A]">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select devices on this page" />
              </th>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Warranty</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#3A3A3A]">Loading devices…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#3A3A3A]">No devices match this search.</td>
              </tr>
            ) : rows.map((device) => (
              <tr key={device.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(device.id)}
                    onChange={() => toggle(device.id)}
                    aria-label={`Select ${device.serial_number}`}
                  />
                </td>
                <td className="px-4 py-3">
                  {device.status === 'pending' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={serialDrafts[device.id] || ''}
                        disabled={!editable || savingId === device.id}
                        onChange={(event) => setSerialDrafts((current) => ({ ...current, [device.id]: event.target.value }))}
                        placeholder="Serial number"
                        className="min-h-11 w-40 px-3 py-1 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      />
                      {device.product?.warranty_months == null ? (
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={warrantyDrafts[device.id] || ''}
                          disabled={!editable || savingId === device.id}
                          onChange={(event) => setWarrantyDrafts((current) => ({ ...current, [device.id]: event.target.value }))}
                          placeholder="Warranty months"
                          className="min-h-11 w-28 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                        />
                      ) : null}
                      {editable ? (
                        <Button size="sm" isLoading={savingId === device.id} onClick={() => void savePending(device)}>
                          Save
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <Link href={`/admin/devices/${device.id}`} className="font-mono text-sm text-[#FF7A19] font-semibold">
                      {device.serial_number}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1A1A]">{device.model_name}</td>
                <td className="px-4 py-3">
                  <p className="text-sm text-[#1A1A1A]">{device.customer_name || '—'}</p>
                  <p className="text-xs text-[#3A3A3A]">{device.customer_email || ''}</p>
                </td>
                <td className="px-4 py-3 text-sm">
                  {device.order_id && device.order_number ? (
                    <Link href={`/admin/orders?open=${device.order_id}`} className="text-[#FF7A19] font-medium">
                      {device.order_number}
                    </Link>
                  ) : (
                    <span className="text-[#3A3A3A]">{device.order_number || '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DeviceWarrantyBadge warranty={device.warranty} />
                </td>
                <td className="px-4 py-3 text-sm text-[#1A1A1A]">{device.user_id ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <Badge
                    size="sm"
                    variant={device.status === 'active' ? 'success' : device.status === 'transferred' ? 'warning' : device.status === 'pending' ? 'info' : 'default'}
                  >
                    {STATUS_LABEL[device.status] || device.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          Previous
        </Button>
        <p className="text-sm text-[#3A3A3A]">Page {page} of {totalPages}</p>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
