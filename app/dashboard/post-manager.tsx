'use client';

import { useRouter } from 'next/navigation';
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  addPostImageAction,
  createPostAction,
  deletePostAction,
  deletePostImageAction,
  uploadExistingPostCoverAction,
  uploadExistingPostGalleryAction,
  uploadNewPostCoverAction,
  uploadNewPostGalleryAction,
  updatePostAction,
  updatePostImageAction,
  type PostActionState,
  type UploadedImage,
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
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

type GalleryDraft = {
  key: string;
  imageUrl?: string;
  sortOrder?: number;
};

export default function PostManager({
  initialPosts,
  postTypes,
  postsError,
  postTypesError,
}: PostManagerProps) {
  const toast = useToast();
  const [selectedPostId, setSelectedPostId] = useState(initialPosts[0]?.id ?? '');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const posts = initialPosts;
  const selectedPost =
    posts.find((post) => post.id === selectedPostId) ?? posts[0] ?? null;

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

  function handleDeletePost(post: AdminPost) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deletePostAction(post.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? 'Post deleted.');
      setSelectedPostId('');
    });
  }

  return (
    <>
      <div
        className={`grid gap-6 ${
          selectedPost ? 'xl:grid-cols-[minmax(0,1fr)_440px]' : ''
        }`}
      >
        <section className="space-y-6">
          {(postsError || postTypesError) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {postsError && <p>Posts: {postsError}</p>}
              {postTypesError && <p>Types: {postTypesError}</p>}
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">All posts</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {filteredPosts.length} of {posts.length} posts shown
                  </p>
                </div>
                <button
                  className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
                  onClick={() => setIsAddingPost(true)}
                  type="button"
                >
                  Add post
                </button>
              </div>

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

            <div>
              {filteredPosts.length ? (
                <div className="divide-y divide-slate-100">
                  {filteredPosts.map((post) => (
                    <button
                      className={`grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] ${
                        selectedPost?.id === post.id ? 'bg-blue-50' : 'bg-white'
                      }`}
                      key={post.id}
                      onClick={() => {
                        setSelectedPostId(post.id);
                        setIsAddingPost(false);
                      }}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-950">
                          {post.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {post.slug ? `/${post.slug}` : post.id}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        <StatusPill active={Boolean(post.published)} label="Published" />
                        <StatusPill active={Boolean(post.featured)} label="Featured" />
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                          {getTypeName(post, postTypes)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center bg-white px-6 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-lg font-semibold text-slate-500">
                    P
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-950">
                    No posts to show
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Adjust the filters or create the first post for the website.
                  </p>
                </div>
              )}
            </div>
          </div>

        </section>

        {selectedPost && (
          <aside className="space-y-6 xl:sticky xl:top-5 xl:self-start">
            <EditPostPanel
              key={`edit-${selectedPost.id}`}
              post={selectedPost}
              postTypes={postTypes}
            />
            <GalleryPanel key={`gallery-${selectedPost.id}`} post={selectedPost} />
            <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-red-700">Delete post</h2>
              <p className="mt-1 text-sm text-slate-500">
                Deletes the post and its gallery images.
              </p>
              <button
                className="mt-4 h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:bg-red-300"
                disabled={isDeleting}
                onClick={() => handleDeletePost(selectedPost)}
                type="button"
              >
                {isDeleting ? 'Deleting...' : 'Delete post'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {isAddingPost && (
        <CreatePostModal
          onCancel={() => setIsAddingPost(false)}
          postTypes={postTypes}
        />
      )}
    </>
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
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [galleryRows, setGalleryRows] = useState<GalleryDraft[]>([
    createGalleryDraft(),
  ]);

  useActionToast(state);

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
              onClick={onCancel}
              type="button"
            >
              Cancel
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
          <PostFields
            coverImageValue={coverImageUrl}
            onCoverImageChange={setCoverImageUrl}
            postTypes={postTypes}
            coverUploadSlot={
              <FileDropZone
                action={uploadNewPostCoverAction}
                label="Cover image"
                multiple={false}
                onUploaded={(result) => {
                  if (result.upload?.url) {
                    setCoverImageUrl(result.upload.url);
                  }
                }}
              />
            }
          />

          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Gallery</h3>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() =>
                  setGalleryRows((rows) => [
                    ...rows,
                    createGalleryDraft(),
                  ])
                }
                type="button"
              >
                Add row
              </button>
            </div>
            <FileDropZone
              action={uploadNewPostGalleryAction}
              className="mt-3"
              label="Upload gallery images"
              multiple
              uploadIndividually
              onUploaded={(result) => {
                const uploads = result.uploads ?? (result.upload ? [result.upload] : []);

                if (uploads.length) {
                  setGalleryRows((rows) => [
                    ...rows.filter((row) => row.imageUrl),
                    ...uploads.map((upload, index) =>
                      createGalleryDraft(upload.url, rows.length + index)
                    ),
                  ]);
                }
              }}
            />
            <div className="mt-3 space-y-3">
              {galleryRows.map((row, index) => (
                <div
                  className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_96px_auto]"
                  key={row.key}
                >
                  <TextInput
                    defaultValue={row.imageUrl}
                    label="Image URL"
                    name="image_url"
                  />
                  <TextInput label="Caption" name="image_caption" />
                  <TextInput
                    defaultValue={String(row.sortOrder ?? index)}
                    label="Order"
                    name="image_sort_order"
                    type="number"
                  />
                  <button
                    className="self-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    disabled={galleryRows.length === 1}
                    onClick={() =>
                      setGalleryRows((rows) =>
                        rows.filter((item) => item.key !== row.key)
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
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
  uploadIndividually = false,
}: {
  action: (formData: FormData) => Promise<UploadActionState>;
  className?: string;
  label: string;
  multiple?: boolean;
  onUploaded?: (result: UploadActionState) => void;
  refreshOnUpload?: boolean;
  uploadIndividually?: boolean;
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
      if (uploadIndividually) {
        const uploads: UploadedImage[] = [];

        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);

          const result = await action(formData);

          if (result.error) {
            toast.error(result.error);
            continue;
          }

          uploads.push(...(result.uploads ?? (result.upload ? [result.upload] : [])));
        }

        if (uploads.length) {
          const result = {
            ok: true,
            message: `${uploads.length} image${uploads.length === 1 ? '' : 's'} uploaded.`,
            uploads,
          };
          toast.success(result.message);
          onUploaded?.(result);
        }

        return;
      }

      const formData = new FormData();

      for (const file of files) {
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
      </span>
    </label>
  );
}

function EditPostPanel({
  post,
  postTypes,
}: {
  post: AdminPost;
  postTypes: PostType[];
}) {
  const updateAction = updatePostAction.bind(null, post.id);
  const uploadCoverAction = uploadExistingPostCoverAction.bind(null, post.id);
  const [coverImageUrl, setCoverImageUrl] = useState(post.cover_image ?? '');
  const [state, formAction, isUpdating] = useActionState(
    updateAction,
    INITIAL_ACTION_STATE
  );

  useActionToast(state);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Edit post</h2>
          <p className="mt-1 truncate text-sm text-slate-500">{post.id}</p>
        </div>
        <button
          className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          disabled={isUpdating}
          type="submit"
        >
          {isUpdating ? 'Saving...' : 'Save'}
        </button>
      </div>
      <PostFields
        coverImageValue={coverImageUrl}
        onCoverImageChange={setCoverImageUrl}
        post={post}
        postTypes={postTypes}
        coverUploadSlot={
          <FileDropZone
            action={uploadCoverAction}
            label="Replace cover image"
            multiple={false}
            onUploaded={(result) => {
              if (result.upload?.url) {
                setCoverImageUrl(result.upload.url);
              }
            }}
            refreshOnUpload
          />
        }
      />
    </form>
  );
}

function GalleryPanel({ post }: { post: AdminPost }) {
  const images = post.images ?? [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Gallery images</h2>
      <p className="mt-1 text-sm text-slate-500">
        Adds and edits through the post image endpoints.
      </p>

      <FileDropZone
        action={uploadExistingPostGalleryAction.bind(null, post.id)}
        className="mt-4"
        label="Upload gallery images"
        multiple
        refreshOnUpload
      />

      <AddImageForm postId={post.id} />

      <div className="mt-5 space-y-3">
        {images.length ? (
          images.map((image) => (
            <GalleryImageForm image={image} key={image.id} postId={post.id} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No gallery images returned for this post.
          </div>
        )}
      </div>
    </div>
  );
}

function AddImageForm({ postId }: { postId: string }) {
  const action = addPostImageAction.bind(null, postId);
  const [state, formAction, isAdding] = useActionState(action, INITIAL_ACTION_STATE);

  useActionToast(state);

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3">
      <TextInput label="Image URL" name="image_url" required />
      <TextInput label="Caption" name="caption" />
      <TextInput defaultValue="0" label="Order" name="sort_order" type="number" />
      <button
        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        disabled={isAdding}
        type="submit"
      >
        {isAdding ? 'Adding...' : 'Add image'}
      </button>
    </form>
  );
}

function GalleryImageForm({
  image,
  postId,
}: {
  image: PostImage;
  postId: string;
}) {
  const toast = useToast();
  const action = updatePostImageAction.bind(null, postId, image.id);
  const [state, formAction, isUpdating] = useActionState(
    action,
    INITIAL_ACTION_STATE
  );
  const [isDeleting, startDeleteTransition] = useTransition();

  useActionToast(state);

  return (
    <form action={formAction} className="rounded-lg border border-slate-100 p-3">
      <div className="grid gap-3">
        <TextInput defaultValue={image.image_url} label="Image URL" name="image_url" />
        <TextInput
          defaultValue={image.caption ?? ''}
          label="Caption"
          name="caption"
        />
        <TextInput
          defaultValue={String(image.sort_order ?? 0)}
          label="Order"
          name="sort_order"
          type="number"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="h-9 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
          disabled={isUpdating}
          type="submit"
        >
          {isUpdating ? 'Saving...' : 'Save image'}
        </button>
        <button
          className="h-9 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          disabled={isDeleting}
          onClick={() => {
            if (!confirm('Delete this gallery image?')) {
              return;
            }

            startDeleteTransition(async () => {
              const result = await deletePostImageAction(postId, image.id);

              if (result.error) {
                toast.error(result.error);
                return;
              }

              toast.success(result.message ?? 'Gallery image deleted.');
            });
          }}
          type="button"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </form>
  );
}

function PostFields({
  coverImageValue,
  coverUploadSlot,
  onCoverImageChange,
  post,
  postTypes,
}: {
  coverImageValue?: string;
  coverUploadSlot?: React.ReactNode;
  onCoverImageChange?: (value: string) => void;
  post?: AdminPost;
  postTypes: PostType[];
}) {
  const coverInputProps =
    coverImageValue === undefined
      ? { defaultValue: post?.cover_image ?? '' }
      : {
          value: coverImageValue,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onCoverImageChange?.(event.target.value),
        };

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput defaultValue={post?.title ?? ''} label="Title" name="title" required />
        <TextInput defaultValue={post?.slug ?? ''} label="Slug" name="slug" />
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
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
      {coverUploadSlot}
      <TextInput
        {...coverInputProps}
        label="Cover image"
        name="cover_image"
        placeholder="https://.../storage/v1/object/public/website/posts/covers/example.jpg"
      />
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
        className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
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

function createGalleryDraft(imageUrl = '', sortOrder = 0): GalleryDraft {
  return {
    key: crypto.randomUUID(),
    imageUrl,
    sortOrder,
  };
}

function validateFiles(files: File[]) {
  if (!files.length) {
    return 'Choose an image file to upload.';
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
