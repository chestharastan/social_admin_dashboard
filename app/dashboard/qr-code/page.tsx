import QrCodeManager from '@/app/dashboard/qr-code/qr-code-manager';
import { backendJsonRequest } from '@/app/dashboard/posts-api';

export type QrLinkRecord = {
  qr_id: string;
  qr_name: string;
  qr_url: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export default async function QrCodePage() {
  const qrLinksResult = await backendJsonRequest<QrLinkRecord[]>('/qr-links');

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Generate QR Code
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Enter any URL to create, preview, and download its QR code.
        </p>
      </header>

      <QrCodeManager
        initialQrLinks={qrLinksResult.data ?? []}
        qrLinksError={qrLinksResult.error}
      />
    </div>
  );
}
