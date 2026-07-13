'use server';

import { revalidatePath } from 'next/cache';
import { backendJsonRequest } from '@/app/dashboard/posts-api';

export type PostActionState = {
  ok?: boolean;
  created?: boolean;
  message?: string;
  error?: string;
};

export type UploadedImage = {
  image_id: string;
  bucket: string;
  path: string;
  url: string;
  content_type: string;
};

export type UploadActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  upload?: UploadedImage;
  uploads?: UploadedImage[];
};

type JsonBody = Record<string, unknown>;
type CreatedPost = { id: string };

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export async function createPostAction(
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  const payload = buildPostPayload(formData);

  if ('error' in payload) {
    return { error: payload.error };
  }

  const result = await backendJsonRequest<CreatedPost>('/posts', {
    method: 'POST',
    body: JSON.stringify(payload.body),
  });

  if (result.error || !result.data?.id) {
    return { error: result.error ?? 'Post creation did not return a post ID.' };
  }

  const imageIds = getStagedImageIds(formData);

  if (imageIds.length) {
    const attachResult = await attachImagesToPost(result.data.id, imageIds);

    if (attachResult.error) {
      revalidatePath('/dashboard');
      return {
        created: true,
        error: `Post created, but its images could not be attached: ${attachResult.error}`,
      };
    }
  }

  revalidatePath('/dashboard');
  return { ok: true, created: true, message: 'Post created.' };
}

export async function updatePostAction(
  postId: string,
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  if (!postId) {
    return { error: 'Choose a post to update.' };
  }

  const payload = buildPostPayload(formData);

  if ('error' in payload) {
    return { error: payload.error };
  }

  const result = await backendJsonRequest(`/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload.body),
  });

  if (result.error) {
    return { error: result.error };
  }

  if (formData.get('image_order_changed') === 'true') {
    const imageIds = getStagedImageIds(formData);
    const orderResult = await backendJsonRequest('/images/order', {
      method: 'PATCH',
      body: JSON.stringify({
        post_id: postId,
        image_ids: imageIds,
      }),
    });

    if (orderResult.error) {
      revalidatePath('/dashboard');
      return {
        error: `Post updated, but the image order could not be saved: ${orderResult.error}`,
      };
    }
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Post updated.' };
}

export async function deletePostAction(postId: string): Promise<PostActionState> {
  if (!postId) {
    return { error: 'Choose a post to delete.' };
  }

  const result = await backendJsonRequest(`/posts/${postId}`, {
    method: 'DELETE',
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Post deleted.' };
}

export async function deleteImageAction(imageId: string): Promise<PostActionState> {
  if (!imageId) {
    return { error: 'Choose an image to delete.' };
  }

  const result = await backendJsonRequest(`/images/${imageId}`, {
    method: 'DELETE',
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Image deleted.' };
}

export async function uploadImagesBatchAction(
  formData: FormData
): Promise<UploadActionState> {
  return uploadImagesBatch(formData);
}

export async function uploadAndAttachImagesAction(
  postId: string,
  formData: FormData
): Promise<UploadActionState> {
  if (!postId) {
    return { error: 'Choose a post before uploading images.' };
  }

  const uploadResult = await uploadImagesBatch(formData);

  if (uploadResult.error || !uploadResult.uploads?.length) {
    return uploadResult;
  }

  const attachResult = await attachImagesToPost(
    postId,
    uploadResult.uploads.map((upload) => upload.image_id)
  );

  if (attachResult.error) {
    return { error: attachResult.error };
  }

  revalidatePath('/dashboard');

  return {
    ok: true,
    message: `${uploadResult.uploads.length} image${
      uploadResult.uploads.length === 1 ? '' : 's'
    } uploaded and attached.`,
    uploads: uploadResult.uploads,
  };
}

async function uploadImagesBatch(formData: FormData): Promise<UploadActionState> {
  const filesResult = getImageFiles(formData);

  if ('error' in filesResult) {
    return { error: filesResult.error };
  }

  const uploadForm = new FormData();

  for (const file of filesResult.files) {
    uploadForm.append('files', file);
  }

  const result = await backendJsonRequest<UploadedImage[]>('/images/batch', {
    method: 'POST',
    body: uploadForm,
  });

  if (
    result.error ||
    !result.data?.length ||
    result.data.some((upload) => !upload.image_id || !upload.url)
  ) {
    return { error: result.error ?? 'Batch upload did not return valid image data.' };
  }

  return {
    ok: true,
    message: `${result.data.length} image${
      result.data.length === 1 ? '' : 's'
    } uploaded.`,
    uploads: result.data,
  };
}

async function attachImagesToPost(postId: string, imageIds: string[]) {
  return backendJsonRequest('/images', {
    method: 'PATCH',
    body: JSON.stringify({
      post_id: postId,
      image_ids: imageIds,
    }),
  });
}

function buildPostPayload(formData: FormData): { body: JsonBody } | { error: string } {
  const title = getText(formData, 'title');
  const content = getText(formData, 'content');
  const typeId = Number(formData.get('type_id'));

  if (!title) {
    return { error: 'Title is required.' };
  }

  if (!content) {
    return { error: 'Content is required.' };
  }

  if (!Number.isInteger(typeId) || typeId <= 0) {
    return { error: 'Post type is required.' };
  }

  const body: JsonBody = {
    title,
    content,
    type_id: typeId,
    published: formData.get('published') === 'on',
    featured: formData.get('featured') === 'on',
  };

  return { body };
}

function getStagedImageIds(formData: FormData) {
  return formData.getAll('image_id').map(stringValue).filter(Boolean);
}

function getText(formData: FormData, key: string) {
  return stringValue(formData.get(key));
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getImageFiles(formData: FormData): { files: File[] } | { error: string } {
  const files = [...formData.getAll('file'), ...formData.getAll('files')].filter(
    (value): value is File => value instanceof File && value.size > 0
  );

  if (!files.length) {
    return { error: 'Choose an image file to upload.' };
  }

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return { error: `${file.name} is not a supported image type.` };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return { error: `${file.name} is larger than 10 MB.` };
    }
  }

  return { files };
}
