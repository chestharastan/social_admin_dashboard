'use client';

import { useActionState, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  createQrLinkAction,
  type QrActionState,
} from '@/app/dashboard/qr-code/actions';
import type { QrLinkRecord } from '@/app/dashboard/qr-code/page';
import { useToast } from '@/components/ui/toast';

const INITIAL_STATE: QrActionState = {};

export default function QrCodeManager({
  initialQrLinks,
  qrLinksError,
}: {
  initialQrLinks: QrLinkRecord[];
  qrLinksError?: string;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [selectedQr, setSelectedQr] = useState<QrLinkRecord | null>(null);
  const [selectedQrDataUrl, setSelectedQrDataUrl] = useState('');
  const [state, formAction, isSaving] = useActionState(
    createQrLinkAction,
    INITIAL_STATE
  );

  useQrActionToast(state);

  useEffect(() => {
    if (!selectedQr) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedQr(null);
      }
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedQr]);

  function generatePreview() {
    const normalizedName = name.trim();
    const normalizedUrl = url.trim();

    if (!normalizedName || !isValidHttpUrl(normalizedUrl)) {
      return;
    }

    void createQrDataUrl(normalizedUrl).then((dataUrl) => {
      setSelectedQr(null);
      setPreviewName(normalizedName);
      setPreviewUrl(normalizedUrl);
      setPreviewDataUrl(dataUrl);
    });
  }

  function regenerateSavedQr(qrLink: QrLinkRecord) {
    setSelectedQr(qrLink);
    setSelectedQrDataUrl('');

    void createQrDataUrl(qrLink.qr_url).then((dataUrl) => {
      setSelectedQrDataUrl(dataUrl);
    });
  }

  return (
    <div className="space-y-8">
      {qrLinksError && (
        <div className="rounded-md border border-[#f4d49a] bg-[var(--warning-soft)] px-4 py-3 text-sm font-medium text-[var(--warning)]">
          QR links: {qrLinksError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form
          action={formAction}
          className="rounded-md border border-[var(--line)] bg-white p-5 shadow-sm"
          onSubmit={generatePreview}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Generate and save</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Give the QR code a name, then enter any public URL.
          </p>

          <label className="mt-5 grid gap-1.5 text-sm font-medium text-[var(--foreground)]">
            QR name
            <input
              className="h-11 min-w-0 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[#8a9691] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              maxLength={120}
              name="qr_name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Main website"
              required
              value={name}
            />
          </label>

          <label className="mt-4 grid gap-1.5 text-sm font-medium text-[var(--foreground)]">
            URL
            <input
              autoComplete="url"
              className="h-11 min-w-0 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[#8a9691] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              name="qr_url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
              type="url"
              value={url}
            />
          </label>

          <button
            className="mt-4 h-11 rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? 'Saving...' : 'Generate and save'}
          </button>
        </form>

        <QrPreview
          dataUrl={previewDataUrl}
          name={previewName}
          placeholder="Generate and save a URL to see its QR preview."
          url={previewUrl}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Saved QR codes</h2>
          <span className="rounded-full bg-[#ececf1] px-2.5 py-1 text-xs font-semibold text-[#565869]">
            {initialQrLinks.length}
          </span>
        </div>

        {initialQrLinks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {initialQrLinks.map((qrLink, index) => (
              <button
                aria-haspopup="dialog"
                className={`min-w-0 rounded-md border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                  selectedQr === qrLink
                    ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--line)]'
                }`}
                key={`${qrLink.qr_name}-${qrLink.qr_url}-${index}`}
                onClick={() => regenerateSavedQr(qrLink)}
                type="button"
              >
                <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                  {qrLink.qr_name}
                </span>
                <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                  {qrLink.qr_url}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--line-strong)] bg-white px-6 py-12 text-center shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)]">No saved QR codes</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Enter a name and URL to save the first one.
            </p>
          </div>
        )}
      </section>

      {selectedQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#17201d]/65 px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelectedQr(null)}
          role="presentation"
        >
          <section
            aria-labelledby="saved-qr-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-[var(--line)] bg-white p-5 shadow-[0_24px_70px_rgba(23,32,29,0.24)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  className="truncate text-xl font-semibold text-[var(--foreground)]"
                  id="saved-qr-dialog-title"
                >
                  {selectedQr.qr_name}
                </h2>
                <p className="mt-1 break-all text-sm text-[var(--muted)]">
                  {selectedQr.qr_url}
                </p>
              </div>
              <button
                aria-label="Close QR code"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[var(--muted)] transition hover:bg-[#ececf1] hover:text-[var(--foreground)]"
                onClick={() => setSelectedQr(null)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-white p-3">
              {selectedQrDataUrl ? (
                // The QR image is generated as a browser data URL and has no remote source.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`QR code for ${selectedQr.qr_name}`}
                  className="h-full w-full"
                  src={selectedQrDataUrl}
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">Generating QR code...</p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[#f0f4f1]"
                onClick={() => setSelectedQr(null)}
                type="button"
              >
                Close
              </button>
              {selectedQrDataUrl && (
                <a
                  className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                  download={`${safeFilename(selectedQr.qr_name)}-qr.png`}
                  href={selectedQrDataUrl}
                >
                  Download PNG
                </a>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function QrPreview({
  dataUrl,
  name,
  placeholder,
  url,
}: {
  dataUrl: string;
  name: string;
  placeholder?: string;
  url: string;
}) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">QR preview</h2>
      <div className="mt-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)] p-3">
        {dataUrl ? (
          // The QR image is generated as a browser data URL and has no remote source.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`QR code for ${name || url}`} className="h-full w-full" src={dataUrl} />
        ) : (
          <p className="max-w-48 text-center text-sm text-[var(--muted)]">
            {placeholder ?? 'Generating preview...'}
          </p>
        )}
      </div>
      {dataUrl && (
        <>
          <p className="mt-3 truncate text-sm font-semibold text-[var(--foreground)]">{name}</p>
          <p className="mt-1 break-all text-xs text-[var(--muted)]">{url}</p>
          <a
            className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
            download={`${safeFilename(name)}-qr.png`}
            href={dataUrl}
          >
            Download PNG
          </a>
        </>
      )}
    </section>
  );
}

function createQrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    color: { dark: '#020617', light: '#ffffff' },
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 640,
  });
}

function safeFilename(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qr-code';
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function useQrActionToast(state: QrActionState) {
  const toast = useToast();

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.ok && state.message) {
      toast.success(state.message);
    }
  }, [state, toast]);
}
