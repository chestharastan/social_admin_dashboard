'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  createPostAction,
  deletePostAction,
  deleteImageAction,
  uploadAndAttachImagesAction,
  uploadImagesBatchAction,
  updatePostAction,
  type PostActionState,
  type UploadActionState,
} from '@/app/dashboard/actions';
import type { AdminPost, PostImage, PostType } from '@/app/dashboard/posts-api';
import { useToast } from '@/components/ui/toast';

type PostManagerProps = {
  initialPosts: AdminPost[];
  postTypes: PostType[];
  postsError?: string;
  postTypesError?: string;
};

const INITIAL_ACTION_STATE: PostActionState = {};
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_BATCH_FILES = 10;
const WEBP_QUALITY = 0.85;
const WEBP_SOURCE_TYPES = ['image/jpeg', 'image/png'];
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

type GalleryDraft = {
  key: string;
  imageId: string;
  imageUrl: string;
};

export default function PostManager({
  initialPosts,
  postTypes,
  postsError,
  postTypesError,
}: PostManagerProps) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddingPost, setIsAddingPost] = useState(false);

  const posts = initialPosts;

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesType =
        typeFilter === 'all' ||
        String(post.type_id) === typeFilter ||
        post.type_slug === typeFilter ||
        post.type?.slug === typeFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && post.published) ||
        (statusFilter === 'draft' && !post.published) ||
        (statusFilter === 'featured' && post.featured);

      return matchesType && matchesStatus;
    });
  }, [posts, statusFilter, typeFilter]);

  const groupedPosts = useMemo(() => {
    const groups = new Map<string, { name: string; posts: AdminPost[] }>();

    for (const post of filteredPosts) {
      const name = getTypeName(post, postTypes);
      const key = String(
        post.type_id ?? post.type?.id ?? post.type_slug ?? post.type?.slug ?? name
      );
      const group = groups.get(key);

      if (group) {
        group.posts.push(post);
      } else {
        groups.set(key, { name, posts: [post] });
      }
    }

    return Array.from(groups.values());
  }, [filteredPosts, postTypes]);

  return (
    <>
      {(postsError || postTypesError) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {postsError && <p>Posts: {postsError}</p>}
          {postTypesError && <p>Types: {postTypesError}</p>}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">All posts</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredPosts.length} of {posts.length} posts shown
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-48"
                onChange={(event) => setTypeFilter(event.target.value)}
                value={typeFilter}
              >
                <option value="all">All types</option>
                {postTypes.map((type) => (
                  <option key={type.id} value={String(type.id)}>
                    {type.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-48"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="all">All status</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
                <option value="featured">Featured</option>
              </select>
            </div>
          </div>
          <button
            className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
            onClick={() => setIsAddingPost(true)}
            type="button"
          >
            Add post
          </button>
        </div>
      </section>

      {filteredPosts.length ? (
        <div className="space-y-8">
          {groupedPosts.map((group) => (
            <section key={group.name}>
              <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                <h2 className="text-xl font-semibold text-slate-950">{group.name}</h2>
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {group.posts.length}
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {group.posts.map((post) => (
                  <PostCard key={post.id} post={post} postTypes={postTypes} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-lg font-semibold text-slate-500">
            P
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-950">No posts to show</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Adjust the filters or create the first post for the website.
          </p>
        </div>
      )}

      {isAddingPost && (
        <CreatePostModal
          onCancel={() => setIsAddingPost(false)}
          postTypes={postTypes}
        />
      )}
    </>
  );
}

function PostCard({ post, postTypes }: { post: AdminPost; postTypes: PostType[] }) {
  return (
    <Link
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      href={`/dashboard/posts/${post.id}`}
    >
      <div className="aspect-[16/10] overflow-hidden bg-slate-100">
        {post.cover_image ? (
          <div
            aria-label={`${post.title} cover`}
            className="h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-105"
            role="img"
            style={{ backgroundImage: `url(${JSON.stringify(post.cover_image)})` }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
            No cover image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusPill active={Boolean(post.published)} label="Published" />
          {post.featured && <StatusPill active label="Featured" />}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
            {getTypeName(post, postTypes)}
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-950 group-hover:text-blue-700">
          {post.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {getContentPreview(post.content)}
        </p>
      </div>
    </Link>
  );
}

export function PostEditor({
  post,
  postTypes,
}: {
  post: AdminPost;
  postTypes: PostType[];
}) {
  const router = useRouter();
  const toast = useToast();
  const formId = `edit-post-${post.id}`;
  const updateAction = updatePostAction.bind(null, post.id);
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateAction,
    INITIAL_ACTION_STATE
  );
  const [isDeleting, startDeleteTransition] = useTransition();

  useActionToast(updateState);

  function handleDeletePost() {
    if (
      !confirm(
        `Are you sure you want to delete "${post.title}"? This permanently deletes the post and all its images. This action cannot be undone.`
      )
    ) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deletePostAction(post.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? 'Post deleted.');
      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap justify-end gap-2">
        <button
          className="h-10 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          disabled={isDeleting || isUpdating}
          onClick={handleDeletePost}
          type="button"
        >
          {isDeleting ? 'Deleting...' : 'Delete post'}
        </button>
        <Link
          className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          href="/dashboard"
        >
          Cancel
        </Link>
        <button
          className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          disabled={isUpdating || isDeleting}
          form={formId}
          type="submit"
        >
          {isUpdating ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <EditPostPanel
          formAction={updateFormAction}
          formId={formId}
          key={`edit-${post.id}`}
          post={post}
          postTypes={postTypes}
        />
        <aside className="space-y-6">
          <GalleryPanel
            formId={formId}
            key={`gallery-${post.id}-${(post.images ?? [])
              .map((image) => image.id)
              .join('-')}`}
            post={post}
          />
        </aside>
      </div>
    </div>
  );
}

function CreatePostModal({
  onCancel,
  postTypes,
}: {
  onCancel: () => void;
  postTypes: PostType[];
}) {
  const [state, formAction, isCreating] = useActionState(
    createPostAction,
    INITIAL_ACTION_STATE
  );
  const [imageRows, setImageRows] = useState<GalleryDraft[]>([]);
  const [isRemovingImage, startRemoveImageTransition] = useTransition();
  const [draggedImageKey, setDraggedImageKey] = useState<string | null>(null);
  const [dragOverImageKey, setDragOverImageKey] = useState<string | null>(null);
  const draggedImageKeyRef = useRef<string | null>(null);
  const dragOverImageKeyRef = useRef<string | null>(null);
  const toast = useToast();

  useActionToast(state);

  useEffect(() => {
    if (state.created) {
      onCancel();
    }
  }, [onCancel, state.created]);

  function moveImage(draggedKey: string, targetKey: string) {
    setImageRows((rows) => {
      const draggedIndex = rows.findIndex((row) => row.key === draggedKey);
      const targetIndex = rows.findIndex((row) => row.key === targetKey);

      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
        return rows;
      }

      const reorderedRows = [...rows];
      const [draggedRow] = reorderedRows.splice(draggedIndex, 1);
      reorderedRows.splice(targetIndex, 0, draggedRow);
      return reorderedRows;
    });
  }

  function finishImageDrag(targetKey?: string) {
    const sourceKey = draggedImageKeyRef.current;
    const destinationKey = targetKey ?? dragOverImageKeyRef.current;

    if (sourceKey && destinationKey) {
      moveImage(sourceKey, destinationKey);
    }

    draggedImageKeyRef.current = null;
    dragOverImageKeyRef.current = null;
    setDraggedImageKey(null);
    setDragOverImageKey(null);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <form
        action={formAction}
        className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-100 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Add post</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fill the details, then create the post.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isRemovingImage}
              onClick={() =>
                startRemoveImageTransition(async () => {
                  await Promise.all(
                    imageRows.map((image) => deleteImageAction(image.imageId))
                  );
                  onCancel();
                })
              }
              type="button"
            >
              {isRemovingImage ? 'Cancelling...' : 'Cancel'}
            </button>
            <button
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        <div className="p-5">
          <PostFields postTypes={postTypes} />

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Post images</h3>
            <p className="mt-1 text-sm text-slate-500">
              The first image becomes the cover. The remaining images become the gallery.
            </p>
            <FileDropZone
              action={uploadImagesBatchAction}
              className="mt-3"
              label="Upload images"
              multiple
              onUploaded={(result) => {
                const uploads = result.uploads ?? (result.upload ? [result.upload] : []);

                if (uploads.length) {
                  setImageRows((rows) => [
                    ...rows,
                    ...uploads.map((upload) =>
                      createGalleryDraft(upload.image_id, upload.url)
                    ),
                  ]);
                }
              }}
            />
            <div className="mt-3 space-y-3">
              {imageRows.map((row, index) => (
                <div
                  className={`grid grid-cols-[auto_72px_minmax(0,1fr)] gap-3 rounded-lg border bg-slate-50 p-3 transition sm:grid-cols-[auto_72px_minmax(0,1fr)_auto] sm:items-center ${
                    dragOverImageKey === row.key && draggedImageKey !== row.key
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-100'
                  } ${
                    draggedImageKey === row.key ? 'opacity-60' : ''
                  }`}
                  data-image-key={row.key}
                  key={row.key}
                >
                  <input name="image_id" type="hidden" value={row.imageId} />
                  <button
                    aria-label={`Drag image ${index + 1} to reorder`}
                    className="flex h-10 w-8 cursor-grab touch-none select-none items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700 active:cursor-grabbing"
                    disabled={isRemovingImage}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }

                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      draggedImageKeyRef.current = row.key;
                      dragOverImageKeyRef.current = null;
                      setDraggedImageKey(row.key);
                      setDragOverImageKey(null);
                    }}
                    onPointerMove={(event) => {
                      if (draggedImageKeyRef.current !== row.key) {
                        return;
                      }

                      const target = document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest<HTMLElement>('[data-image-key]');
                      const targetKey = target?.dataset.imageKey;

                      if (
                        targetKey &&
                        targetKey !== draggedImageKeyRef.current &&
                        targetKey !== dragOverImageKeyRef.current
                      ) {
                        dragOverImageKeyRef.current = targetKey;
                        setDragOverImageKey(targetKey);
                      }
                    }}
                    onPointerCancel={() => finishImageDrag()}
                    onPointerUp={() => finishImageDrag()}
                    title="Drag to reorder"
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  </button>
                  <ImagePreview
                    alt={`Selected post image ${index + 1}`}
                    imageUrl={row.imageUrl}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {index === 0 ? 'Cover image' : `Gallery image ${index}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Position {index + 1} in the selected order
                    </p>
                  </div>
                  <div className="col-span-3 flex flex-wrap justify-end gap-2 sm:col-span-1">
                    <button
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
                      disabled={isRemovingImage}
                      onClick={() =>
                        startRemoveImageTransition(async () => {
                          const result = await deleteImageAction(row.imageId);

                          if (result.error) {
                            toast.error(result.error);
                            return;
                          }

                          setImageRows((rows) =>
                            rows.filter((item) => item.key !== row.key)
                          );
                        })
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function FileDropZone({
  action,
  className = '',
  label,
  multiple = false,
  onUploaded,
  refreshOnUpload = false,
}: {
  action: (formData: FormData) => Promise<UploadActionState>;
  className?: string;
  label: string;
  multiple?: boolean;
  onUploaded?: (result: UploadActionState) => void;
  refreshOnUpload?: boolean;
}) {
  const inputId = useId();
  const router = useRouter();
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startUploadTransition] = useTransition();

  function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).slice(0, multiple ? undefined : 1);
    const validationError = validateFiles(files);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    startUploadTransition(async () => {
      let uploadFiles: File[];

      try {
        uploadFiles = await Promise.all(files.map(convertImageToWebp));
      } catch {
        toast.error('Could not convert the selected image to WebP.');
        return;
      }

      const convertedValidationError = validateFiles(uploadFiles);

      if (convertedValidationError) {
        toast.error(convertedValidationError);
        return;
      }

      const formData = new FormData();

      for (const file of uploadFiles) {
        formData.append(multiple ? 'files' : 'file', file);
      }

      const result = await action(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? 'Image uploaded.');
      onUploaded?.(result);

      if (refreshOnUpload) {
        router.refresh();
      }
    });
  }

  return (
    <label
      className={`block rounded-lg border border-dashed p-4 transition ${
        isDragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-300 bg-slate-50 hover:border-slate-400'
      } ${className}`}
      htmlFor={inputId}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        accept={SUPPORTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        disabled={isUploading}
        id={inputId}
        multiple={multiple}
        onChange={(event) => {
          if (event.target.files?.length) {
            handleFiles(event.target.files);
          }

          event.currentTarget.value = '';
        }}
        type="file"
      />
      <span className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-slate-500">
          {isUploading ? 'Uploading...' : 'Drop image files here or click to choose'}
        </span>
        <span className="text-xs text-slate-400">
          Up to 10 images, 10 MB each. PNG and JPEG become WebP automatically.
        </span>
      </span>
    </label>
  );
}

function EditPostPanel({
  formAction,
  formId,
  post,
  postTypes,
}: {
  formAction: (formData: FormData) => void;
  formId: string;
  post: AdminPost;
  postTypes: PostType[];
}) {
  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      id={formId}
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Edit post</h2>
        <p className="mt-1 truncate text-sm text-slate-500">{post.id}</p>
      </div>
      <PostFields post={post} postTypes={postTypes} />
    </form>
  );
}

function GalleryPanel({ formId, post }: { formId: string; post: AdminPost }) {
  const [images, setImages] = useState(post.images ?? []);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const imagesRef = useRef(images);
  const draggedImageIdRef = useRef<string | null>(null);
  const dragOverImageIdRef = useRef<string | null>(null);

  function finishImageReorder() {
    const sourceId = draggedImageIdRef.current;
    const targetId = dragOverImageIdRef.current;
    const previousImages = imagesRef.current;

    draggedImageIdRef.current = null;
    dragOverImageIdRef.current = null;
    setDraggedImageId(null);
    setDragOverImageId(null);

    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    const sourceIndex = previousImages.findIndex((image) => image.id === sourceId);
    const targetIndex = previousImages.findIndex((image) => image.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reorderedImages = [...previousImages];
    const [movedImage] = reorderedImages.splice(sourceIndex, 1);
    reorderedImages.splice(targetIndex, 0, movedImage);

    const normalizedImages = reorderedImages.map((image, index) => ({
      ...image,
      image_role: index === 0 ? ('cover' as const) : ('gallery' as const),
      sort_order: index === 0 ? 0 : index - 1,
    }));

    imagesRef.current = normalizedImages;
    setImages(normalizedImages);
    setHasUnsavedOrder(true);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Post images</h2>
        <p className="mt-1 text-sm text-slate-500">
          Drag images into position. The image at the top is always the cover.
        </p>
      </div>

      {hasUnsavedOrder && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          The new image order is only saved in this browser. Click Save at the top
          to update the post.
        </p>
      )}

      {hasUnsavedOrder && (
        <>
          <input form={formId} name="image_order_changed" type="hidden" value="true" />
          {images.map((image) => (
            <input
              form={formId}
              key={`order-${image.id}`}
              name="image_id"
              type="hidden"
              value={image.id}
            />
          ))}
        </>
      )}

      <FileDropZone
        action={uploadAndAttachImagesAction.bind(null, post.id)}
        className="mt-4"
        label="Upload images"
        multiple
        refreshOnUpload
      />

      <div className="mt-5 space-y-3">
        {images.map((image, index) => (
          <ExistingImageCard
            dragHandle={
              <button
                aria-label={`Drag image ${index + 1} to reorder`}
                className="flex h-10 w-8 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                onPointerCancel={finishImageReorder}
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }

                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  draggedImageIdRef.current = image.id;
                  dragOverImageIdRef.current = null;
                  setDraggedImageId(image.id);
                  setDragOverImageId(null);
                }}
                onPointerMove={(event) => {
                  if (draggedImageIdRef.current !== image.id) {
                    return;
                  }

                  if (event.clientY < 80) {
                    window.scrollBy({ top: -14, behavior: 'auto' });
                  } else if (event.clientY > window.innerHeight - 80) {
                    window.scrollBy({ top: 14, behavior: 'auto' });
                  }

                  const target = document
                    .elementFromPoint(event.clientX, event.clientY)
                    ?.closest<HTMLElement>('[data-post-image-id]');
                  const targetId = target?.dataset.postImageId;

                  if (
                    targetId &&
                    targetId !== draggedImageIdRef.current &&
                    targetId !== dragOverImageIdRef.current
                  ) {
                    dragOverImageIdRef.current = targetId;
                    setDragOverImageId(targetId);
                  }
                }}
                onPointerUp={finishImageReorder}
                title="Drag to reorder"
                type="button"
              >
                <DragHandleIcon />
              </button>
            }
            image={image}
            isCover={index === 0}
            isDragging={draggedImageId === image.id}
            isDropTarget={
              dragOverImageId === image.id && draggedImageId !== image.id
            }
            key={image.id}
          />
        ))}
        {!images.length && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No images returned for this post.
          </div>
        )}
      </div>
    </div>
  );
}

function ExistingImageCard({
  dragHandle,
  image,
  isCover,
  isDragging,
  isDropTarget,
}: {
  dragHandle: React.ReactNode;
  image: PostImage;
  isCover: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <div
      className={`grid min-w-0 grid-cols-[auto_72px_minmax(0,1fr)] gap-3 overflow-hidden rounded-lg border p-3 transition sm:grid-cols-[auto_72px_minmax(0,1fr)_auto] sm:items-center ${
        isDropTarget ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
      } ${isDragging ? 'opacity-60' : 'bg-white'}`}
      data-post-image-id={image.id}
    >
      {dragHandle}
      <div className="relative">
        <ImagePreview
          alt={isCover ? 'Cover image' : 'Gallery image'}
          imageUrl={image.image_url}
        />
        {isCover && (
          <span className="absolute left-1 top-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Cover
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {isCover ? 'Cover image' : 'Gallery image'}
        </p>
        <p className="mt-1 text-xs text-slate-500">Drag to change its position</p>
      </div>
      <div className="col-span-3 flex justify-end sm:col-span-1">
        <button
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          disabled={isDeleting}
          onClick={() => {
            if (!confirm(`Delete this ${isCover ? 'cover' : 'gallery'} image?`)) {
              return;
            }

            startDeleteTransition(async () => {
              const result = await deleteImageAction(image.id);

              if (result.error) {
                toast.error(result.error);
                return;
              }

              toast.success(result.message ?? 'Image deleted.');
              router.refresh();
            });
          }}
          type="button"
        >
          {isDeleting ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function PostFields({
  post,
  postTypes,
}: {
  post?: AdminPost;
  postTypes: PostType[];
}) {
  return (
    <div className="mt-5 grid gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <TextInput defaultValue={post?.title ?? ''} label="Title" name="title" required />
          {/* <p className="mt-1.5 text-xs text-slate-500">
            The slug is generated automatically from the title.
          </p> */}
        </div>
        <label className="grid w-full gap-1.5 text-sm font-medium text-slate-700 sm:w-36 sm:shrink-0">
          Type
          <select
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            defaultValue={post?.type_id ?? postTypes[0]?.id ?? ''}
            name="type_id"
            required
          >
            {postTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Content
        <textarea
          className="min-h-36 resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          defaultValue={post?.content ?? ''}
          name="content"
          required
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <CheckInput
          defaultChecked={Boolean(post?.published)}
          label="Published"
          name="published"
        />
        <CheckInput
          defaultChecked={Boolean(post?.featured)}
          label="Featured"
          name="featured"
        />
      </div>
    </div>
  );
}

function TextInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        {...props}
        className="h-10 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}

function ImagePreview({
  alt,
  imageUrl,
}: {
  alt: string;
  imageUrl: string;
}) {
  return (
    <div
      aria-label={alt}
      className="h-[72px] w-full rounded-lg border border-slate-200 bg-slate-100 bg-cover bg-center"
      role="img"
      style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
    />
  );
}

function CheckInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        {...props}
        className="h-4 w-4 rounded border-slate-300 text-blue-600"
        type="checkbox"
      />
      {label}
    </label>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-medium ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {label}
    </span>
  );
}

function createGalleryDraft(
  imageId: string,
  imageUrl: string
): GalleryDraft {
  return {
    key: crypto.randomUUID(),
    imageId,
    imageUrl,
  };
}

function validateFiles(files: File[]) {
  if (!files.length) {
    return 'Choose an image file to upload.';
  }

  if (files.length > MAX_BATCH_FILES) {
    return `Choose no more than ${MAX_BATCH_FILES} images at a time.`;
  }

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return `${file.name} is not a supported image type.`;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return `${file.name} is larger than 10 MB.`;
    }
  }

  return null;
}

async function convertImageToWebp(file: File): Promise<File> {
  if (!WEBP_SOURCE_TYPES.includes(file.type)) {
    return file;
  }

  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas is not supported.');
    }

    context.drawImage(bitmap, 0, 0);

    const webpBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob?.type === 'image/webp') {
            resolve(blob);
          } else {
            reject(new Error('WebP conversion failed.'));
          }
        },
        'image/webp',
        WEBP_QUALITY
      );
    });

    return new File([webpBlob], replaceFileExtension(file.name, 'webp'), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

function replaceFileExtension(filename: string, extension: string) {
  const basename = filename.replace(/\.[^/.]+$/, '');
  return `${basename || 'image'}.${extension}`;
}

function useActionToast(state: PostActionState) {
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

function getTypeName(post: AdminPost, postTypes: PostType[]) {
  return (
    post.type?.name ??
    postTypes.find((type) => type.id === post.type_id)?.name ??
    post.type_slug ??
    'Unknown'
  );
}

function getContentPreview(content?: string | null, maxLength = 140) {
  const normalized = content?.replace(/\s+/g, ' ').trim() ?? '';

  if (!normalized) {
    return 'No content';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const shortened = normalized.slice(0, maxLength + 1);
  const lastSpace = shortened.lastIndexOf(' ');
  const cutoff = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;

  return `${shortened.slice(0, cutoff).trim()}...`;
}
