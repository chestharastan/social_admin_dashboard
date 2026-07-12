'use server';

import { revalidatePath } from 'next/cache';
import { backendJsonRequest } from '@/app/dashboard/posts-api';

export type PostActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
};

export type UploadedImage = {
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
  const payload = buildPostPayload(formData, true);

  if ('error' in payload) {
    return { error: payload.error };
  }

  const result = await backendJsonRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(payload.body),
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Post created.' };
}

export async function updatePostAction(
  postId: string,
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  if (!postId) {
    return { error: 'Choose a post to update.' };
  }

  const payload = buildPostPayload(formData, false);

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

export async function addPostImageAction(
  postId: string,
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  if (!postId) {
    return { error: 'Choose a post before adding an image.' };
  }

  const payload = buildImagePayload(formData, true);

  if ('error' in payload) {
    return { error: payload.error };
  }

  const result = await backendJsonRequest(`/posts/${postId}/images`, {
    method: 'POST',
    body: JSON.stringify(payload.body),
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Gallery image added.' };
}

export async function updatePostImageAction(
  postId: string,
  imageId: string,
  _prevState: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  if (!postId || !imageId) {
    return { error: 'Choose an image to update.' };
  }

  const payload = buildImagePayload(formData, false);

  if ('error' in payload) {
    return { error: payload.error };
  }

  const result = await backendJsonRequest(`/posts/${postId}/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload.body),
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Gallery image updated.' };
}

export async function deletePostImageAction(
  postId: string,
  imageId: string
): Promise<PostActionState> {
  if (!postId || !imageId) {
    return { error: 'Choose an image to delete.' };
  }

  const result = await backendJsonRequest(`/posts/${postId}/images/${imageId}`, {
    method: 'DELETE',
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath('/dashboard');
  return { ok: true, message: 'Gallery image deleted.' };
}

export async function uploadNewPostCoverAction(
  formData: FormData
): Promise<UploadActionState> {
  const fileResult = getOneImageFile(formData);

  if ('error' in fileResult) {
    return { error: fileResult.error };
  }

  const uploadForm = new FormData();
  uploadForm.set('file', fileResult.file);

  const result = await backendJsonRequest<UploadedImage>('/posts/uploads/covers', {
    method: 'POST',
    body: uploadForm,
  });

  if (result.error || !result.data?.url) {
    return { error: result.error ?? 'Upload did not return an image URL.' };
  }

  return {
    ok: true,
    message: 'Cover uploaded.',
    upload: result.data,
  };
}

export async function uploadNewPostGalleryAction(
  formData: FormData
): Promise<UploadActionState> {
  const fileResult = getOneImageFile(formData);

  if ('error' in fileResult) {
    return { error: fileResult.error };
  }

  const uploadForm = new FormData();
  uploadForm.set('file', fileResult.file);

  const result = await backendJsonRequest<UploadedImage>('/posts/uploads/gallery', {
    method: 'POST',
    body: uploadForm,
  });

  if (result.error || !result.data?.url) {
    return { error: result.error ?? 'Upload did not return an image URL.' };
  }

  return {
    ok: true,
    message: 'Gallery image uploaded.',
    upload: result.data,
  };
}

export async function uploadExistingPostCoverAction(
  postId: string,
  formData: FormData
): Promise<UploadActionState> {
  if (!postId) {
    return { error: 'Choose a post before uploading a cover.' };
  }

  const fileResult = getOneImageFile(formData);

  if ('error' in fileResult) {
    return { error: fileResult.error };
  }

  const uploadForm = new FormData();
  uploadForm.set('file', fileResult.file);

  const result = await backendJsonRequest<UploadedImage>(
    `/posts/${postId}/cover`,
    {
      method: 'POST',
      body: uploadForm,
    }
  );

  if (result.error || !result.data?.url) {
    return { error: result.error ?? 'Upload did not return an image URL.' };
  }

  revalidatePath('/dashboard');

  return {
    ok: true,
    message: 'Cover uploaded and updated.',
    upload: result.data,
  };
}

export async function uploadExistingPostGalleryAction(
  postId: string,
  formData: FormData
): Promise<UploadActionState> {
  if (!postId) {
    return { error: 'Choose a post before uploading gallery images.' };
  }

  const filesResult = getImageFiles(formData);

  if ('error' in filesResult) {
    return { error: filesResult.error };
  }

  const files = filesResult.files;
  const uploadForm = new FormData();
  const isMultiUpload = files.length > 1;

  for (const file of files) {
    uploadForm.append(isMultiUpload ? 'files' : 'file', file);
  }

  const result = await backendJsonRequest<UploadedImage | UploadedImage[]>(
    isMultiUpload
      ? `/posts/${postId}/images/uploads`
      : `/posts/${postId}/images/upload`,
    {
      method: 'POST',
      body: uploadForm,
    }
  );

  if (result.error || !result.data) {
    return { error: result.error ?? 'Upload did not return image data.' };
  }

  revalidatePath('/dashboard');

  const uploads = Array.isArray(result.data) ? result.data : [result.data];

  return {
    ok: true,
    message: `${uploads.length} gallery image${
      uploads.length === 1 ? '' : 's'
    } uploaded.`,
    uploads,
  };
}

function buildPostPayload(
  formData: FormData,
  includeImages: boolean
): { body: JsonBody } | { error: string } {
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

  const slug = getText(formData, 'slug');
  const coverImage = getText(formData, 'cover_image');

  if (slug) {
    body.slug = slug;
  }

  if (coverImage) {
    body.cover_image = coverImage;
  }

  if (includeImages) {
    const images = buildImageList(formData);

    if (images.length) {
      body.images = images;
    }
  }

  return { body };
}

function buildImageList(formData: FormData) {
  const urls = formData.getAll('image_url').map(stringValue);
  const captions = formData.getAll('image_caption').map(stringValue);
  const sortOrders = formData.getAll('image_sort_order').map(stringValue);

  return urls
    .map((imageUrl, index) => {
      if (!imageUrl) {
        return null;
      }

      return {
        image_url: imageUrl,
        caption: captions[index] || undefined,
        sort_order: parseSortOrder(sortOrders[index], index),
      };
    })
    .filter(Boolean);
}

function buildImagePayload(
  formData: FormData,
  requireUrl: boolean
): { body: JsonBody } | { error: string } {
  const imageUrl = getText(formData, 'image_url');
  const caption = getText(formData, 'caption');
  const sortOrder = getText(formData, 'sort_order');

  if (requireUrl && !imageUrl) {
    return { error: 'Image URL is required.' };
  }

  const body: JsonBody = {};

  if (imageUrl) {
    body.image_url = imageUrl;
  }

  body.caption = caption;
  body.sort_order = parseSortOrder(sortOrder, 0);

  return { body };
}

function getText(formData: FormData, key: string) {
  return stringValue(formData.get(key));
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseSortOrder(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getOneImageFile(formData: FormData): { file: File } | { error: string } {
  const result = getImageFiles(formData);

  if ('error' in result) {
    return result;
  }

  return { file: result.files[0] };
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
