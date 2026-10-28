export const OPERATING_SYSTEMS = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'chromeos', label: 'ChromeOS' },
  { value: 'linux', label: 'Linux' },
  { value: 'none', label: 'None' },
] as const;

export const PRODUCT_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'refurbished', label: 'Refurbished' },
  { value: 'used', label: 'Used' },
] as const;

export const FAQ_AUDIENCES = [
  { value: 'store', label: 'Store FAQ' },
  { value: 'device_portal', label: 'Device portal' },
  { value: 'both', label: 'Store and portal' },
] as const;

export type OperatingSystem = (typeof OPERATING_SYSTEMS)[number]['value'];
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number]['value'];
export type FaqAudience = (typeof FAQ_AUDIENCES)[number]['value'];
