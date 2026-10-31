'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { Badge } from '@/components/ui/Badge';
import { LoadGate, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
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
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
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
  const [portalStats, setPortalStats] = useState<{
    last_7_days: Record<string, number | null>;
    last_30_days: Record<string, number | null>;
  } | null>(null);

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
        setLoaded(true);
        setFailed(false);
        setForbidden(false);
      } catch (error) {
        if (!cancelled) {
          const kind = noteQueryFail(error);
          if (kind === 'forbidden') setForbidden(true);
          else if (kind !== 'unauthorized') setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, search, status, warranty, page, reloadToken]);

  useEffect(() => {
    if (!bootstrapped) return;
    let cancelled = false;
    deviceRequest<{ last_7_days: Record<string, number | null>; last_30_days: Record<string, number | null> }>(
      '/api/admin/devices/portal-stats'
    )
      .then((result) => {
        if (!cancelled) setPortalStats(result.data);
      })
      .catch((error) => console.error('portal stats', error));
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, reloadToken]);

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

  const waitingDays = (createdAt?: string) => {
    if (!createdAt) return 0;
    const started = Date.parse(createdAt);
    if (!Number.isFinite(started)) return 0;
    return Math.max(0, Math.floor((Date.now() - started) / (24 * 60 * 60 * 1000)));
  };

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Devices"
        subtitle={`${total} device${total === 1 ? '' : 's'}`}
        primary={editable ? { label: 'Add from orders', href: '/admin/devices/new' } : undefined}
        secondary={[{ label: 'Print labels', onClick: printLabels }]}
      />
      {portalStats ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-[#1A1A1A]">Portal activity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['Last 7 days', portalStats.last_7_days],
              ['Last 30 days', portalStats.last_30_days],
            ] as const).map(([label, counts]) => (
              <div key={label} className="text-sm text-[#3A3A3A]">
                <p className="font-medium text-[#1A1A1A]">{label}</p>
                <p>Scans {counts.scan ?? 0} · Guides {counts.guide_open ?? 0} · FAQs {counts.faq_open ?? 0}</p>
                <p>
                  Claims {counts.claim_start ?? 0} started, {counts.claim_complete ?? 0} completed
                  {counts.claim_completion_rate != null ? ` (${counts.claim_completion_rate}%)` : ''}
                </p>
                <p>Service {counts.service_start ?? 0}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <FilterBar
        search={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search devices"
        activeCount={[status, warranty].filter(Boolean).length}
        onClear={() => {
          setStatus('');
          setWarranty('');
        }}
      >
        <select
          value={warranty}
          onChange={(event) => {
            setWarranty(event.target.value as '' | 'active' | 'expired');
            setPage(1);
          }}
          className={filterSelectClassName()}
        >
          <option value="">All warranties</option>
          <option value="active">Warranty active</option>
          <option value="expired">Warranty expired</option>
        </select>
      </FilterBar>

      <div className="flex flex-wrap gap-3">
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
      </div>

      <LoadGate
        loaded={loaded}
        loading={loading}
        updating={loading && loaded}
        error={failed}
        forbidden={forbidden}
        isEmpty={rows.length === 0}
        filtered={Boolean(search || status || warranty)}
        onRetry={() => setReloadToken((n) => n + 1)}
        onClearFilters={() => {
          setSearchInput('');
          setSearch('');
          setStatus('');
          setWarranty('');
        }}
        skeleton={<TableSkeleton rows={6} />}
        emptyTitle="No devices yet"
        emptyDescription="Registered laptops will show up here."
        emptyPrimary={{ label: 'Add a device', href: '/admin/devices/new' }}
        denyHome="/admin"
      >
        <>
          <ResponsiveTable
            headers={
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={rows.map((device) => (
              <AdminRowCard
                key={device.id}
                name={device.serial_number || device.model_name || 'Awaiting serial'}
                href={device.status === 'pending' ? undefined : `/admin/devices/${device.id}`}
                status={
                  <Badge
                    size="sm"
                    variant={device.status === 'active' ? 'success' : device.status === 'transferred' ? 'warning' : device.status === 'pending' ? 'info' : 'default'}
                  >
                    {STATUS_LABEL[device.status] || device.status}
                  </Badge>
                }
                facts={[
                  { label: 'Customer', value: device.customer_name || '—' },
                  { label: 'Warranty', value: <DeviceWarrantyBadge warranty={device.warranty} /> },
                  { label: 'Order', value: device.order_number || '—' },
                ]}
                actions={
                  <RowActions
                    name={device.serial_number || device.model_name}
                    actions={[
                      { label: 'View', href: `/admin/devices/${device.id}` },
                      { label: 'Edit', href: `/admin/devices/${device.id}` },
                    ]}
                  />
                }
              />
            ))}
          >
            {rows.map((device) => (
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
                  {device.status === 'pending' ? (
                    <p className="mb-1 text-xs text-amber-800">Waiting {waitingDays(device.created_at)} days</p>
                  ) : null}
                  <Badge
                    size="sm"
                    variant={device.status === 'active' ? 'success' : device.status === 'transferred' ? 'warning' : device.status === 'pending' ? 'info' : 'default'}
                  >
                    {STATUS_LABEL[device.status] || device.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActions
                    name={device.serial_number || device.model_name}
                    actions={[
                      { label: 'View', href: `/admin/devices/${device.id}` },
                      { label: 'Edit', href: `/admin/devices/${device.id}` },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </ResponsiveTable>

          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      </LoadGate>
    </div>
  );
}
