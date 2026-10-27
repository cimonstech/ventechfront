import { Badge } from '@/components/ui/Badge';
import { DeviceWarranty, formatDeviceDate } from '@/lib/devicesAdmin';

const LABEL: Record<DeviceWarranty['status'], string> = {
  active: 'Active',
  expired: 'Expired',
  none: 'None',
};

export function DeviceWarrantyBadge({ warranty, showDate = true }: { warranty: DeviceWarranty; showDate?: boolean }) {
  const variant = warranty.status === 'active' ? 'success' : warranty.status === 'expired' ? 'error' : 'default';
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Badge variant={variant} size="sm">{LABEL[warranty.status] || 'None'}</Badge>
      {showDate && warranty.endsOn ? (
        <span className="text-xs text-[#3A3A3A]">{formatDeviceDate(warranty.endsOn)}</span>
      ) : null}
    </span>
  );
}
