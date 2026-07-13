'use server';

import { revalidatePath } from 'next/cache';
import { backendJsonRequest } from '@/app/dashboard/posts-api';

export type QrActionState = {
  error?: string;
  message?: string;
  ok?: boolean;
};

export async function createQrLinkAction(
  _previousState: QrActionState,
  formData: FormData
): Promise<QrActionState> {
  const qrName = getText(formData, 'qr_name');
  const qrUrl = getText(formData, 'qr_url');

  if (!qrName || !qrUrl) {
    return { error: 'Enter a QR name and URL.' };
  }

  const result = await backendJsonRequest('/qr-links', {
    method: 'POST',
    body: JSON.stringify({ qr_name: qrName, qr_url: qrUrl }),
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard/qr-code');
  return { ok: true, message: 'QR code saved.' };
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
