'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { downloadBlob, qrDataUrl, safeFileName } from '@/lib/deviceQr';
import { apiMessage, devicePublicUrl } from '@/lib/devicesAdmin';

const FALLBACK_PHONE = '+233 55 134 4310';

export function OwnerQrCard({
  qrToken,
  modelName,
  serialNumber,
  phone,
}: {
  qrToken: string;
  modelName: string;
  serialNumber: string;
  phone?: string | null;
}) {
  const [image, setImage] = useState('');
  const [working, setWorking] = useState(false);
  const publicUrl = devicePublicUrl(qrToken);
  const supportPhone = (phone || '').trim() || FALLBACK_PHONE;

  useEffect(() => {
    if (!publicUrl) {
      setImage('');
      return;
    }
    let cancelled = false;
    qrDataUrl(publicUrl, 280)
      .then((url) => {
        if (!cancelled) setImage(url);
      })
      .catch((error) => {
        if (!cancelled) toast.error(apiMessage(error, 'Could not draw the QR code'));
      });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const downloadPng = async () => {
    if (!publicUrl) {
      toast.error('Could not build this QR link.');
      return;
    }
    setWorking(true);
    try {
      const dataUrl = await qrDataUrl(publicUrl, 512);
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(`ventech-${safeFileName(serialNumber)}.png`, blob);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not download this QR code'));
    } finally {
      setWorking(false);
    }
  };

  const printSticker = async () => {
    let src = image;
    if (!src && publicUrl) {
      try {
        src = await qrDataUrl(publicUrl, 512);
      } catch (error) {
        toast.error(apiMessage(error, 'Could not draw the QR code'));
        return;
      }
    }
    if (!src) {
      toast.error('Could not draw the QR code');
      return;
    }
    const popup = window.open('', '_blank', 'width=420,height=520');
    if (!popup) {
      toast.error('Allow pop-ups to print the sticker.');
      return;
    }
    popup.document.write(stickerHtml({
      image: src,
      model: modelName,
      serial: serialNumber,
      phone: supportPhone,
    }));
    popup.document.close();
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
      <h2 className="font-semibold text-[#1A1A1A]">My QR code</h2>
      <div className="flex justify-center rounded-xl bg-[#F4F1EC] p-4">
        {image ? (
          <img src={image} alt={`QR code for ${serialNumber}`} className="h-44 w-44 object-contain bg-white p-2 rounded-lg" />
        ) : (
          <div className="h-44 w-44 rounded-lg bg-white" />
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button className="w-full min-h-11" variant="secondary" onClick={() => void downloadPng()} isLoading={working}>
          Download PNG
        </Button>
        <Button className="w-full min-h-11" variant="outline" onClick={() => void printSticker()}>
          Print sticker
        </Button>
      </div>
      <p className="text-sm text-[#3A3A3A]">
        If your sticker is lost or damaged, print this, or ask VENTECH for a new one.
      </p>
    </section>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stickerHtml(input: { image: string; model: string; serial: string; phone: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>VENTECH sticker</title>
  <style>
    @page { size: 70mm 40mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .label {
      width: 70mm;
      height: 40mm;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 4mm;
      padding: 3mm;
      font-family: Arial, sans-serif;
      color: #1A1A1A;
    }
    img { width: 22mm; height: 22mm; object-fit: contain; }
    .copy { min-width: 0; }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; margin: 0 0 2mm; }
    p { margin: 0 0 1mm; font-size: 11px; }
    .serial { font-family: ui-monospace, Consolas, monospace; }
    .phone { color: #3A3A3A; }
    .actions { margin: 12px; font-family: Arial, sans-serif; }
    @media print {
      .actions { display: none !important; }
      body { background: #fff; }
    }
  </style>
</head>
<body>
  <article class="label">
    <img src="${escapeHtml(input.image)}" alt="" />
    <div class="copy">
      <p class="brand">VENTECH</p>
      <p>${escapeHtml(input.model)}</p>
      <p class="serial">${escapeHtml(input.serial)}</p>
      <p class="phone">${escapeHtml(input.phone)}</p>
    </div>
  </article>
  <p class="actions"><button type="button" onclick="window.print()">Print</button></p>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;
}
