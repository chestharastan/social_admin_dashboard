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
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          QR links: {qrLinksError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form
          action={formAction}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={generatePreview}
        >
          <h2 className="text-lg font-semibold text-slate-950">Generate and save</h2>
          <p className="mt-1 text-sm text-slate-500">
            Give the QR code a name, then enter any public URL.
          </p>

          <label className="mt-5 grid gap-1.5 text-sm font-medium text-slate-700">
            QR name
            <input
              className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              maxLength={120}
              name="qr_name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Main website"
              required
              value={name}
            />
          </label>

          <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700">
            URL
            <input
              autoComplete="url"
              className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              name="qr_url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
              type="url"
              value={url}
            />
          </label>

          <button
            className="mt-4 h-11 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300"
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
          <h2 className="text-xl font-semibold text-slate-950">Saved QR codes</h2>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {initialQrLinks.length}
          </span>
        </div>

        {initialQrLinks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {initialQrLinks.map((qrLink) => (
              <button
                aria-haspopup="dialog"
                className={`min-w-0 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedQr?.qr_id === qrLink.qr_id
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-slate-200'
                }`}
                key={qrLink.qr_id}
                onClick={() => regenerateSavedQr(qrLink)}
                type="button"
              >
                <span className="block truncate text-sm font-semibold text-slate-950">
                  {qrLink.qr_name}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {qrLink.qr_url}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <h3 className="font-semibold text-slate-950">No saved QR codes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter a name and URL to save the first one.
            </p>
          </div>
        )}
      </section>

      {selectedQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 px-4 py-8 backdrop-blur-sm"
          onClick={() => setSelectedQr(null)}
          role="presentation"
        >
          <section
            aria-labelledby="saved-qr-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  className="truncate text-xl font-semibold text-slate-950"
                  id="saved-qr-dialog-title"
                >
                  {selectedQr.qr_name}
                </h2>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {selectedQr.qr_url}
                </p>
              </div>
              <button
                aria-label="Close QR code"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setSelectedQr(null)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
              {selectedQrDataUrl ? (
                // The QR image is generated as a browser data URL and has no remote source.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`QR code for ${selectedQr.qr_name}`}
                  className="h-full w-full"
                  src={selectedQrDataUrl}
                />
              ) : (
                <p className="text-sm text-slate-400">Generating QR code...</p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setSelectedQr(null)}
                type="button"
              >
                Close
              </button>
              {selectedQrDataUrl && (
                <a
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
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
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">QR preview</h2>
      <div className="mt-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        {dataUrl ? (
          // The QR image is generated as a browser data URL and has no remote source.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`QR code for ${name || url}`} className="h-full w-full" src={dataUrl} />
        ) : (
          <p className="max-w-48 text-center text-sm text-slate-400">
            {placeholder ?? 'Generating preview...'}
          </p>
        )}
      </div>
      {dataUrl && (
        <>
          <p className="mt-3 truncate text-sm font-semibold text-slate-900">{name}</p>
          <p className="mt-1 break-all text-xs text-slate-500">{url}</p>
          <a
            className="mt-3 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
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
