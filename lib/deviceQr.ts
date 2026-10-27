import QRCode from 'qrcode';

export function qrDataUrl(value: string, width: number): Promise<string> {
  return QRCode.toDataURL(value, { width, margin: 1, errorCorrectionLevel: 'M' });
}

export function qrSvg(value: string): Promise<string> {
  return QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function safeFileName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'device';
}
