'use client';

import { Badge } from '@/components/ui/Badge';
import { InfoTip } from '@/components/ui/InfoNote';
import { DeviceWarranty, formatDeviceDate } from '@/lib/devicesAdmin';

const LABEL: Record<DeviceWarranty['status'], string> = {
  active: 'Active',
  expired: 'Expired',
  none: 'None',
  starts_on_delivery: 'Starts on delivery',
};

function warrantyTip(warranty: DeviceWarranty): string {
  const date = formatDeviceDate(warranty.endsOn);
  if (warranty.status === 'active') return `Covered until ${date || '—'}.`;
  if (warranty.status === 'expired') {
    return `Warranty ended on ${date || '—'}. VENTECH can still help; repairs may be charged.`;
  }
  if (warranty.status === 'starts_on_delivery') {
    return 'Warranty starts when your laptop is delivered.';
  }
  return 'No warranty is recorded for this laptop.';
}

export function DeviceWarrantyBadge({ warranty, showDate = true }: { warranty: DeviceWarranty; showDate?: boolean }) {
  const variant = warranty.status === 'active' ? 'success' : warranty.status === 'expired' ? 'error' : warranty.status === 'starts_on_delivery' ? 'warning' : 'default';
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <InfoTip text={warrantyTip(warranty)}>
        <Badge variant={variant} size="sm">{LABEL[warranty.status] || 'None'}</Badge>
      </InfoTip>
      {showDate && warranty.endsOn ? (
        <span className="text-xs text-[#3A3A3A]">{formatDeviceDate(warranty.endsOn)}</span>
      ) : null}
    </span>
  );
}
