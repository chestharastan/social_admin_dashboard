import QrCodeManager from '@/app/dashboard/qr-code/qr-code-manager';
import { backendJsonRequest } from '@/app/dashboard/posts-api';

export type QrLinkRecord = {
  qr_name: string;
  qr_url: string;
};

export default async function QrCodePage() {
  const qrLinksResult = await backendJsonRequest<QrLinkRecord[]>('/qr-links');

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
            QR codes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
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
