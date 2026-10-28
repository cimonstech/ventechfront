'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useAccess } from '@/context/AccessContext';
import { OrderLookup, apiMessage, deviceRequest } from '@/lib/devicesAdmin';

interface UnitDraft {
  key: string;
  order_item_id: string;
  product_id: string;
  product_name: string;
  serial_number: string;
  warranty_months: string;
  purchase_date: string;
}

export default function AddDevicesPage() {
  const router = useRouter();
  const { canEdit } = useAccess();
  const editable = canEdit('devices');
  const [orderNumber, setOrderNumber] = useState('');
  const [lookup, setLookup] = useState<OrderLookup | null>(null);
  const [units, setUnits] = useState<UnitDraft[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const search = async () => {
    const number = orderNumber.trim();
    if (!number) {
      toast.error('Enter an order number');
      return;
    }
    setSearching(true);
    try {
      const result = await deviceRequest<OrderLookup>(
        `/api/admin/devices/order-lookup?order_number=${encodeURIComponent(number)}`
      );
      const orderDate = result.data.order.created_at.slice(0, 10);
      const drafts: UnitDraft[] = [];
      for (const item of result.data.items) {
        if (!item.product_id) continue;
        const remaining = Math.max(0, Number(item.quantity) - Number(item.devices_registered));
        for (let index = 0; index < remaining; index += 1) {
          drafts.push({
            key: `${item.order_item_id}-${index}`,
            order_item_id: item.order_item_id,
            product_id: item.product_id,
            product_name: item.product_name,
            serial_number: '',
            warranty_months: item.warranty_months === null || item.warranty_months === undefined ? '' : String(item.warranty_months),
            purchase_date: orderDate,
          });
        }
      }
      setLookup(result.data);
      setUnits(drafts);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load that order'));
    } finally {
      setSearching(false);
    }
  };

  const updateUnit = (key: string, patch: Partial<UnitDraft>) => {
    setUnits((current) => current.map((unit) => unit.key === key ? { ...unit, ...patch } : unit));
  };

  const save = async () => {
    if (!lookup) return;
    if (units.length === 0) {
      toast.error('Every unit on this order already has a device');
      return;
    }
    if (units.some((unit) => !unit.serial_number.trim())) {
      toast.error('Enter a serial number for every laptop');
      return;
    }
    for (const unit of units) {
      if (unit.warranty_months.trim() !== '') {
        const months = Number(unit.warranty_months);
        if (!Number.isInteger(months) || months < 0 || months > 120) {
          toast.error('Warranty months must be between 0 and 120');
          return;
        }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(unit.purchase_date)) {
        toast.error('Enter a purchase date for every laptop');
        return;
      }
    }

    setSaving(true);
    try {
      const result = await deviceRequest('/api/admin/devices', {
        method: 'POST',
        body: JSON.stringify({
          order_id: lookup.order.id,
          items: units.map((unit) => ({
            order_item_id: unit.order_item_id,
            product_id: unit.product_id,
            serial_number: unit.serial_number.trim(),
            ...(unit.warranty_months.trim() === '' ? {} : { warranty_months: Number(unit.warranty_months) }),
            purchase_date: unit.purchase_date,
          })),
        }),
      });
      toast.success(result.message);
      router.push(`/admin/devices?order=${encodeURIComponent(lookup.order.order_number)}`);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save devices'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/devices" className="text-sm text-[#FF7A19] font-medium">Back to devices</Link>
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
        <input
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="Order number"
          className="min-h-11 w-full min-w-0 flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] sm:min-w-[220px]"
        />
        <Button onClick={search} isLoading={searching}>Search</Button>
      </div>

      {lookup && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="font-semibold text-[#1A1A1A]">{lookup.order.order_number}</p>
            <p className="text-sm text-[#3A3A3A]">{lookup.order.customer_name || 'Guest'} · {lookup.order.customer_email || 'No email'}</p>
          </div>

          {lookup.items.map((item) => {
            const itemUnits = units.filter((unit) => unit.order_item_id === item.order_item_id);
            return (
              <div key={item.order_item_id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold text-[#1A1A1A]">{item.product_name}</h2>
                  <p className="text-sm text-[#3A3A3A]">
                    Quantity {item.quantity} · {item.devices_registered} already registered
                  </p>
                </div>
                {!item.product_id && (
                  <p className="text-sm text-[#3A3A3A]">This product is no longer available.</p>
                )}
                {item.product_id && itemUnits.length === 0 && (
                  <p className="text-sm text-[#3A3A3A]">Every unit of this item already has a device.</p>
                )}
                {itemUnits.map((unit, index) => (
                  <div key={unit.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                    <label className="block text-sm">
                      <span className="font-semibold text-[#1A1A1A]">Serial {index + 1}</span>
                      <input
                        value={unit.serial_number}
                        disabled={!editable}
                        onChange={(event) => updateUnit(unit.key, { serial_number: event.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-semibold text-[#1A1A1A]">Warranty months</span>
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={unit.warranty_months}
                        disabled={!editable}
                        onChange={(event) => updateUnit(unit.key, { warranty_months: event.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-semibold text-[#1A1A1A]">Purchase date</span>
                      <input
                        type="date"
                        value={unit.purchase_date}
                        disabled={!editable}
                        onChange={(event) => updateUnit(unit.key, { purchase_date: event.target.value })}
                        className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      />
                    </label>
                  </div>
                ))}
              </div>
            );
          })}

          {editable && (
            <Button onClick={save} isLoading={saving} disabled={units.length === 0}>Save devices</Button>
          )}
        </div>
      )}
    </div>
  );
}
