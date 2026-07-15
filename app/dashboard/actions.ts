'use server';

import { revalidatePath } from 'next/cache';
import { backendJsonRequest } from '@/app/dashboard/posts-api';
import {
  documentFromLegacy,
  parseContentDocument,
  plainTextFromDocument,
  replacePendingMediaIds,
  type ContentDocument,
} from '@/app/dashboard/post-content';

export type PostActionState = {
  ok?: boolean;
  created?: boolean;
  postId?: string;
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
  if (!getText(formData, 'title')) {
    return { error: 'Title is required.' };
  }

  const requestedTypeId = Number(formData.get('type_id'));
  if (!Number.isInteger(requestedTypeId) || requestedTypeId <= 0) {
    return { error: 'Post type is required.' };
  }

  const imageFiles = collectImageFiles(formData);
  let uploadedImageIds: string[] = [];
  const pendingMediaReplacements = new Map<string, string>();

  if (imageFiles.length) {
    const filesResult = validateImageFiles(imageFiles);

    if ('error' in filesResult) {
      return { error: filesResult.error };
    }

    const uploadResult = await uploadImagesBatch(formData);

    if (
      uploadResult.error ||
      !uploadResult.uploads?.length ||
      uploadResult.uploads.length !== imageFiles.length
    ) {
      if (uploadResult.uploads?.length) {
        await cleanupUploadedImages(
          uploadResult.uploads.map((upload) => upload.image_id)
        );
      }
      return {
        error: `Post creation was cancelled because its images could not be uploaded: ${
          uploadResult.error ?? 'The upload response did not include every image.'
        }`,
      };
    }

    uploadedImageIds = uploadResult.uploads.map((upload) => upload.image_id);
    const fileKeys = formData.getAll('file_key').map(stringValue).filter(Boolean);

    fileKeys.forEach((fileKey, index) => {
      const imageId = uploadedImageIds[index];
      if (imageId) pendingMediaReplacements.set(fileKey, imageId);
    });
  }

  const payload = buildPostPayload(formData, pendingMediaReplacements);

  if ('error' in payload) {
    await cleanupUploadedImages(uploadedImageIds);
    return { error: payload.error };
  }

  // New posts always begin as drafts. Publishing remains an explicit edit action.
  payload.body.published = false;

  const result = await backendJsonRequest<CreatedPost>('/posts', {
    method: 'POST',
    body: JSON.stringify(payload.body),
  });

  if (result.error || !result.data?.id) {
    await cleanupUploadedImages(uploadedImageIds);
    return { error: result.error ?? 'Post creation did not return a post ID.' };
  }

  if (uploadedImageIds.length) {
    const attachResult = await attachImagesToPost(result.data.id, uploadedImageIds);

    if (attachResult.error) {
      await rollbackCreatedPost(result.data.id, uploadedImageIds);
      return {
        error: `Post creation was cancelled because its images could not be attached: ${attachResult.error}`,
      };
    }
  }

  revalidatePath('/dashboard');
  return {
    ok: true,
    created: true,
    postId: result.data.id,
    message: 'Post created.',
  };
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

export async function updatePostStatusAction(
  postId: string,
  status: { published?: boolean; featured?: boolean }
): Promise<PostActionState> {
  if (!postId) {
    return { error: 'Choose a post to update.' };
  }

  const body: JsonBody = {};

  if (typeof status.published === 'boolean') {
    body.published = status.published;
  }

  if (typeof status.featured === 'boolean') {
    body.featured = status.featured;
  }

  if (!Object.keys(body).length) {
    return { error: 'Choose a post status to update.' };
  }

  const result = await backendJsonRequest(`/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/posts/${postId}`);
  return { ok: true, message: 'Post status updated.' };
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

async function rollbackCreatedPost(postId: string, imageIds: string[] = []) {
  await backendJsonRequest(`/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });

  // The post deletion removes attached files. This second pass removes any
  // uploads that were still staged when attachment failed.
  await cleanupUploadedImages(imageIds);
}

async function cleanupUploadedImages(imageIds: string[]) {
  await Promise.all(
    imageIds.map((imageId) =>
      backendJsonRequest(`/images/${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      })
    )
  );
}

function buildPostPayload(
  formData: FormData,
  pendingMediaReplacements: ReadonlyMap<string, string> = new Map()
): { body: JsonBody } | { error: string } {
  const title = getText(formData, 'title');
  const typeId = Number(formData.get('type_id'));

  if (!title) {
    return { error: 'Title is required.' };
  }

  if (!Number.isInteger(typeId) || typeId <= 0) {
    return { error: 'Post type is required.' };
  }

  const rawContentJson = getText(formData, 'content_json');
  let contentDocument: ContentDocument | null;

  if (rawContentJson) {
    let parsedValue: unknown;

    try {
      parsedValue = JSON.parse(rawContentJson);
    } catch {
      return { error: 'Article content is not valid JSON.' };
    }

    const pendingDocument = parseContentDocument(parsedValue, {
      allowPendingMedia: true,
    });

    if (!pendingDocument) {
      return { error: 'Article content contains an invalid section.' };
    }

    contentDocument = replacePendingMediaIds(
      pendingDocument,
      pendingMediaReplacements
    );

    if (!contentDocument) {
      return {
        error: 'An image used in the article has not been uploaded. Select it again.',
      };
    }
  } else {
    contentDocument = documentFromLegacy(getText(formData, 'content'));
  }

  if (!contentDocument.blocks.length) {
    return { error: 'Add at least one article content section.' };
  }

  const content = plainTextFromDocument(contentDocument) || 'Media post';

  const body: JsonBody = {
    title,
    content,
    content_json: contentDocument,
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
  return validateImageFiles(collectImageFiles(formData));
}

function collectImageFiles(formData: FormData) {
  return [...formData.getAll('file'), ...formData.getAll('files')].filter(
    (value): value is File => value instanceof File && value.size > 0
  );
}

function validateImageFiles(files: File[]): { files: File[] } | { error: string } {
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
