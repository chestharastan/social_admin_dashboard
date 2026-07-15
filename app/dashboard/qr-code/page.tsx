import QrCodeManager from '@/app/dashboard/qr-code/qr-code-manager';
import { backendJsonRequest } from '@/app/dashboard/posts-api';

export type QrLinkRecord = {
  qr_name: string;
  qr_url: string;
};

export default async function QrCodePage() {
  const qrLinksResult = await backendJsonRequest<QrLinkRecord[]>('/qr-links');

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-8">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="type-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            QR codes
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Generate a QR code for any public URL, save it for later, or download
            it as an image.
          </p>
        </div>
      </header>

      <QrCodeManager
        initialQrLinks={qrLinksResult.data ?? []}
        qrLinksError={qrLinksResult.error}
      />
    </div>
  );
}
