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
  updatePostAction,
  updatePostStatusAction,
  type PostActionState,
  type UploadActionState,
} from '@/app/dashboard/actions';
import {
  normalizeContentDocument,
  parseContentDocument,
  plainTextFromDocument,
  referencedMediaIds,
} from '@/app/dashboard/post-content';
import type { AdminPost, PostImage, PostType } from '@/app/dashboard/posts-api';
import { PostBlockEditor } from '@/components/dashboard/post-block-editor';
import { useToast } from '@/components/ui/toast';
import { FilterListbox } from '@/components/ui/filter-select';

type PostManagerProps = {
  createdPostId?: string;
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
  file: File;
  imageUrl: string;
};

export default function PostManager({
  createdPostId,
  initialPosts,
  postTypes,
  postsError,
  postTypesError,
}: PostManagerProps) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [publicationFilter, setPublicationFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');

  useEffect(() => {
    if (!createdPostId) return;

    const url = new URL(window.location.href);
    url.searchParams.delete('createdPost');
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [createdPostId]);

  const posts = initialPosts;

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesType =
        typeFilter === 'all' ||
        String(post.type_id) === typeFilter ||
        post.type_slug === typeFilter ||
        post.type?.slug === typeFilter;
      const matchesPublication =
        publicationFilter === 'all' ||
        (publicationFilter === 'published' && post.published === true) ||
        (publicationFilter === 'draft' && post.published !== true);
      const matchesFeatured =
        featuredFilter === 'all' ||
        (featuredFilter === 'featured' && post.featured === true) ||
        (featuredFilter === 'not-featured' && post.featured !== true);

      return matchesType && matchesPublication && matchesFeatured;
    });
  }, [featuredFilter, posts, publicationFilter, typeFilter]);

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
      {createdPostId && (
        <div className="pointer-events-none fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm">
          <div
            aria-live="polite"
            className="glass-modal pointer-events-auto flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
            role="status"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckmarkIcon />
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--foreground)]">
              Post created
            </p>
            <Link
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
              href={`/dashboard/posts/${createdPostId}/view`}
            >
              View post
            </Link>
          </div>
        </div>
      )}

      {(postsError || postTypesError) && (
        <div className="rounded-md border border-[#f4d49a] bg-[var(--warning-soft)] px-4 py-3 text-sm font-medium text-[var(--warning)]">
          {postsError && <p>Posts: {postsError}</p>}
          {postTypesError && <p>Types: {postTypesError}</p>}
        </div>
      )}

      <section className="glass-panel relative z-20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="shrink-0">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Content library</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {filteredPosts.length} of {posts.length} posts shown
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:ml-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <FilterListbox
                onChange={setTypeFilter}
                value={typeFilter}
                options={[
                  { value: 'all', label: 'All types' },
                  ...postTypes.map((type) => ({
                    value: String(type.id),
                    label: type.name,
                  })),
                ]}
              />
              <FilterListbox
                onChange={setPublicationFilter}
                value={publicationFilter}
                options={[
                  { value: 'all', label: 'All visibility' },
                  { value: 'published', label: 'Published' },
                  { value: 'draft', label: 'Drafts' },
                ]}
              />
              <FilterListbox
                onChange={setFeaturedFilter}
                value={featuredFilter}
                options={[
                  { value: 'all', label: 'All highlights' },
                  { value: 'featured', label: 'Featured' },
                  { value: 'not-featured', label: 'Not featured' },
                ]}
              />
            </div>

            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[var(--accent-strong)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              href="/dashboard/posts/new"
              prefetch
            >
              Create Post
            </Link>
          </div>
        </div>
      </section>

      {filteredPosts.length ? (
        <div className="space-y-8">
          {groupedPosts.map((group) => (
            <section key={group.name}>
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--line)] pb-3">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{group.name}</h2>
                <span className="rounded-full bg-[#ececf1] px-2.5 py-1 text-xs font-semibold text-[#565869]">
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
        <div className="glass-panel flex min-h-64 flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent-strong)]">
            P
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">No posts to show</h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
            Adjust the filters or create the first post for the website.
          </p>
        </div>
      )}

    </>
  );
}

function PostCard({ post, postTypes }: { post: AdminPost; postTypes: PostType[] }) {
  return (
    <Link
      className="glass-panel glass-panel-interactive group flex h-full flex-col overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
      href={`/dashboard/posts/${post.id}/view`}
    >
      <div className="aspect-[16/10] overflow-hidden bg-[var(--surface-muted)]">
        {post.cover_image ? (
          <div
            aria-label={`${post.title} cover`}
            className="h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-105"
            role="img"
            style={{ backgroundImage: `url(${JSON.stringify(post.cover_image)})` }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-[var(--muted)]">
            No cover image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {post.featured && (
            <span
              aria-label="Featured post"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-strong)]"
              title="Featured"
            >
              <HighlightIcon active />
            </span>
          )}
          <StatusPill
            active={Boolean(post.published)}
            label={post.published ? 'Published' : 'Draft'}
          />
          <span className="rounded-full bg-[#ececf1] px-2.5 py-1 font-medium text-[#565869]">
            {getTypeName(post, postTypes)}
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--accent-strong)]">
          {post.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {getContentPreview(post.content, post.content_json)}
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

  async function updateWithProgress(
    previousState: PostActionState,
    formData: FormData
  ) {
    try {
      return await updatePostAction(post.id, previousState, formData);
    } catch {
      return { error: 'Could not update the post. Please try again.' };
    }
  }

  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateWithProgress,
    INITIAL_ACTION_STATE
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isStatusUpdating, startStatusTransition] = useTransition();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (updateState.error) {
      toast.error(updateState.error);
    }
  }, [toast, updateState.error]);

  useEffect(() => {
    if (!isMoreOpen) return;

    function closeMoreMenu(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreOpen(false);
      }
    }

    function closeMoreMenuOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMoreOpen(false);
    }

    document.addEventListener('mousedown', closeMoreMenu);
    document.addEventListener('keydown', closeMoreMenuOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeMoreMenu);
      document.removeEventListener('keydown', closeMoreMenuOnEscape);
    };
  }, [isMoreOpen]);

  function handleStatusChange(
    status: { published?: boolean; featured?: boolean },
    successMessage: string
  ) {
    setIsMoreOpen(false);
    startStatusTransition(async () => {
      const result = await updatePostStatusAction(post.id, status);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(successMessage);
      router.refresh();
    });
  }

  function handleDeletePost() {
    setIsMoreOpen(false);

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

  function goToPost() {
    router.push(`/dashboard/posts/${post.id}/view`);
    router.refresh();
  }

  const editorActions = (
    <div className="flex flex-wrap justify-end gap-2">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-px hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
          href="/dashboard"
        >
          <CloseIcon />
          Cancel
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[var(--accent-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-sm"
          disabled={isUpdating || isDeleting}
          form={formId}
          type="submit"
        >
          {isUpdating ? <SpinnerIcon /> : <CheckmarkIcon />}
          {isUpdating ? 'Saving…' : 'Save'}
        </button>
        <div className="relative" ref={moreMenuRef}>
          <button
            aria-expanded={isMoreOpen}
            aria-haspopup="menu"
            aria-label="More post actions"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted-strong)] shadow-sm transition hover:-translate-y-px hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:translate-y-0 disabled:opacity-50"
            disabled={isDeleting || isUpdating || isStatusUpdating}
            onClick={() => setIsMoreOpen((current) => !current)}
            type="button"
          >
            <MoreIcon />
          </button>

          {isMoreOpen && (
            <div
              className="glass-modal absolute right-0 top-full z-50 mt-2 w-52 p-1.5"
              role="menu"
            >
              <PostMenuButton
                icon={<VisibilityIcon visible={!post.published} />}
                label={post.published ? 'Move to draft' : 'Publish post'}
                onClick={() =>
                  handleStatusChange(
                    { published: !post.published },
                    post.published ? 'Post moved to drafts.' : 'Post published.'
                  )
                }
              />
              <PostMenuButton
                icon={<HighlightIcon active={!post.featured} />}
                label={post.featured ? 'Remove highlight' : 'Highlight post'}
                onClick={() =>
                  handleStatusChange(
                    { featured: !post.featured },
                    post.featured
                      ? 'Post highlight removed.'
                      : 'Post highlighted.'
                  )
                }
              />
              <div className="my-1 border-t border-[var(--line)]" />
              <PostMenuButton
                danger
                icon={<TrashIcon />}
                label={isDeleting ? 'Deleting...' : 'Delete post'}
                onClick={handleDeletePost}
              />
            </div>
          )}
        </div>
    </div>
  );

  return (
    <>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <EditPostPanel
          actions={editorActions}
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

      {(isUpdating || updateState.ok) && (
        <div className="pointer-events-none fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm">
          <div
            aria-live="polite"
            className="glass-modal pointer-events-auto flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 shadow-xl"
            role="status"
          >
            {updateState.ok ? (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckmarkIcon />
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--foreground)]">
                  Post updated
                </p>
                <button
                  autoFocus
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
                  onClick={goToPost}
                  type="button"
                >
                  View post
                </button>
              </>
            ) : (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                  <SpinnerIcon />
                </span>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Saving post…
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function CreatePostForm({ postTypes }: { postTypes: PostType[] }) {
  const router = useRouter();
  const [imageRows, setImageRows] = useState<GalleryDraft[]>([]);
  const imageRowsRef = useRef(imageRows);
  const [isCancelling, startCancelTransition] = useTransition();
  const creationProgressTimerRef = useRef<number | null>(null);
  const [creationProgress, setCreationProgress] = useState(0);
  const toast = useToast();

  function stopCreationProgress() {
    if (creationProgressTimerRef.current !== null) {
      window.clearInterval(creationProgressTimerRef.current);
      creationProgressTimerRef.current = null;
    }
  }

  function startCreationProgress() {
    stopCreationProgress();
    setCreationProgress(5);
    creationProgressTimerRef.current = window.setInterval(() => {
      setCreationProgress((current) => {
        if (current >= 92) return 92;
        return Math.min(92, current + Math.max(1, Math.ceil((92 - current) * 0.06)));
      });
    }, 220);
  }

  function addLocalImages(files: File[]) {
    const validationError = validateFiles(files);

    if (validationError) {
      toast.error(validationError);
      return [];
    }

    if (imageRowsRef.current.length + files.length > MAX_BATCH_FILES) {
      toast.error(`Choose no more than ${MAX_BATCH_FILES} images per post.`);
      return [];
    }

    const drafts = files.map((file) => createGalleryDraft(file));
    setImageRows((rows) => {
      const nextRows = [...rows, ...drafts];
      imageRowsRef.current = nextRows;
      return nextRows;
    });

    return drafts.map((image) => ({
      id: `pending:${image.key}`,
      imageUrl: image.imageUrl,
      label: image.file.name,
    }));
  }

  function removeLocalImage(imageId: string) {
    if (!imageId.startsWith('pending:')) return;
    const key = imageId.slice('pending:'.length);

    setImageRows((rows) => {
      const removed = rows.find((image) => image.key === key);
      if (removed) URL.revokeObjectURL(removed.imageUrl);
      const nextRows = rows.filter((image) => image.key !== key);
      imageRowsRef.current = nextRows;
      return nextRows;
    });
  }

  async function createWithLocalImages(
    previousState: PostActionState,
    formData: FormData
  ) {
    startCreationProgress();

    try {
      let orderedDrafts = imageRowsRef.current;
      const rawContentDocument = formData.get('content_json');

      if (typeof rawContentDocument === 'string') {
        try {
          const parsedDocument = parseContentDocument(
            JSON.parse(rawContentDocument),
            { allowPendingMedia: true }
          );
          if (parsedDocument) {
            const draftsById = new Map(
              imageRowsRef.current.map((image) => [
                `pending:${image.key}`,
                image,
              ])
            );
            orderedDrafts = referencedMediaIds(parsedDocument).flatMap((id) => {
              const draft = draftsById.get(id);
              return draft ? [draft] : [];
            });
          }
        } catch {
          // The server action will return the canonical content validation error.
        }
      }

      const files = await Promise.all(
        orderedDrafts.map(async (image) => {
          try {
            return await convertImageToWebp(image.file);
          } catch {
            // Conversion is an optimization; retain the valid original if it fails.
            return image.file;
          }
        })
      );
      const validationError = validateFiles(files);

      if (files.length && validationError) {
        stopCreationProgress();
        setCreationProgress(0);
        return { error: validationError };
      }

      formData.delete('files');
      formData.delete('file_key');
      files.forEach((file, index) => {
        formData.append('files', file);
        const draft = orderedDrafts[index];
        if (draft) formData.append('file_key', `pending:${draft.key}`);
      });
      const result = await createPostAction(previousState, formData);
      stopCreationProgress();

      if (result.created && result.postId) {
        setCreationProgress(100);
        imageRowsRef.current.forEach((image) => URL.revokeObjectURL(image.imageUrl));
        setImageRows([]);
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        router.push(
          `/dashboard?createdPost=${encodeURIComponent(result.postId)}`
        );
        router.refresh();
      } else {
        setCreationProgress(0);
      }

      return result;
    } catch {
      stopCreationProgress();
      setCreationProgress(0);
      return { error: 'Could not create the post. Please try again.' };
    }
  }

  const [state, formAction, isCreating] = useActionState(
    createWithLocalImages,
    INITIAL_ACTION_STATE
  );

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error, toast]);

  useEffect(() => {
    imageRowsRef.current = imageRows;
  }, [imageRows]);

  useEffect(() => {
    return () => {
      if (creationProgressTimerRef.current !== null) {
        window.clearInterval(creationProgressTimerRef.current);
      }
      imageRowsRef.current.forEach((image) => URL.revokeObjectURL(image.imageUrl));
    };
  }, []);

  return (
    <>
    <form
      action={formAction}
      className="glass-panel overflow-hidden"
    >
        <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-white/35 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Post details</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Add the content, status, and images for this post.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-px hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:translate-y-0 disabled:opacity-50"
              disabled={isCancelling || isCreating}
              onClick={() =>
                startCancelTransition(() => {
                  imageRowsRef.current.forEach((image) =>
                    URL.revokeObjectURL(image.imageUrl)
                  );
                  setImageRows([]);
                  router.push('/dashboard');
                })
              }
              type="button"
            >
              <CloseIcon />
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
            <button
              className="inline-flex h-10 min-w-[112px] items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[var(--accent-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2 disabled:translate-y-0 disabled:opacity-70 disabled:shadow-sm"
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? <SpinnerIcon /> : <CheckmarkIcon />}
              {isCreating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>

        <div className="p-5">
          <PostFields
            availableImages={imageRows.map((image) => ({
              id: `pending:${image.key}`,
              imageUrl: image.imageUrl,
              label: image.file.name,
            }))}
            onAddImages={addLocalImages}
            onRemoveImage={removeLocalImage}
            postTypes={postTypes}
          />
        </div>
    </form>

    {isCreating && (
      <div className="pointer-events-none fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm">
        <div
          aria-live="polite"
          className="glass-modal pointer-events-auto w-full rounded-2xl px-4 py-3 shadow-xl"
          role="status"
        >
          <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                <SpinnerIcon />
              </span>
              <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--foreground)]">
                Creating post…
              </p>
              <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                {creationProgress}%
              </span>
          </div>
          <div
            aria-label="Create post progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={creationProgress}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.07]"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
              style={{ width: `${creationProgress}%` }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function FileDropZone({
  action,
  className = '',
  label,
  multiple = false,
  onFilesSelected,
  onUploaded,
  refreshOnUpload = false,
}: {
  action?: (formData: FormData) => Promise<UploadActionState>;
  className?: string;
  label: string;
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
  onUploaded?: (result: UploadActionState) => void;
  refreshOnUpload?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const progressTimerRef = useRef<number | null>(null);
  const router = useRouter();
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startUploadTransition] = useTransition();
  const [uploadPhase, setUploadPhase] = useState<
    'idle' | 'preparing' | 'uploading' | 'success' | 'error'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [fileLabel, setFileLabel] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    function preventFileNavigation(event: DragEvent) {
      if (Array.from(event.dataTransfer?.types ?? []).includes('Files')) {
        event.preventDefault();
      }
    }

    document.addEventListener('dragover', preventFileNavigation);
    document.addEventListener('drop', preventFileNavigation);

    return () => {
      document.removeEventListener('dragover', preventFileNavigation);
      document.removeEventListener('drop', preventFileNavigation);

      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
      }

    };
  }, []);

  function stopProgressAnimation() {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function startProgressAnimation() {
    stopProgressAnimation();
    setProgress(6);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return 92;
        return Math.min(92, current + Math.max(1, Math.ceil((92 - current) * 0.08)));
      });
    }, 180);
  }

  function resetUploader() {
    stopProgressAnimation();
    setUploadPhase('idle');
    setProgress(0);
    setFileLabel('');
    setUploadError('');
    inputRef.current?.click();
  }

  function handleFiles(fileList: FileList | File[]) {
    if (isUploading) return;

    const files = Array.from(fileList).slice(0, multiple ? undefined : 1);
    const validationError = validateFiles(files);

    if (validationError) {
      setUploadPhase('error');
      setUploadError(validationError);
      toast.error(validationError);
      return;
    }

    if (onFilesSelected) {
      onFilesSelected(files);
      setUploadPhase('idle');
      setUploadError('');
      return;
    }

    if (!action) {
      const message = 'Image upload is not available.';
      setUploadPhase('error');
      setUploadError(message);
      toast.error(message);
      return;
    }

    setFileLabel(
      files.length === 1 ? files[0].name : `${files.length} images selected`
    );
    setUploadError('');
    setUploadPhase('preparing');
    startProgressAnimation();

    startUploadTransition(async () => {
      let uploadFiles: File[];

      try {
        uploadFiles = await Promise.all(files.map(convertImageToWebp));
      } catch {
        const message = 'Could not prepare the selected image for upload.';
        stopProgressAnimation();
        setUploadPhase('error');
        setUploadError(message);
        toast.error(message);
        return;
      }

      const convertedValidationError = validateFiles(uploadFiles);

      if (convertedValidationError) {
        stopProgressAnimation();
        setUploadPhase('error');
        setUploadError(convertedValidationError);
        toast.error(convertedValidationError);
        return;
      }

      setUploadPhase('uploading');

      const formData = new FormData();

      for (const file of uploadFiles) {
        formData.append(multiple ? 'files' : 'file', file);
      }

      const result = await action(formData);

      if (result.error) {
        stopProgressAnimation();
        setUploadPhase('error');
        setUploadError(result.error);
        toast.error(result.error);
        return;
      }

      stopProgressAnimation();
      setProgress(100);
      setUploadPhase('success');
      toast.success(result.message ?? 'Image uploaded.');
      onUploaded?.(result);

      if (refreshOnUpload) {
        router.refresh();
      } else {
        setUploadPhase('idle');
        setProgress(0);
        setFileLabel('');
      }
    });
  }

  return (
    <div
      className={`rounded-2xl border border-dashed p-4 transition-all duration-200 ${
        isDragging
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_4px_rgba(24,24,27,0.06),0_10px_28px_rgba(24,24,27,0.08)]'
          : uploadPhase === 'error'
            ? 'border-[#f3b7b1] bg-[var(--danger-soft)]/35'
            : 'border-[var(--line-strong)] bg-[var(--surface-muted)] hover:border-[var(--muted)]'
      } ${className}`}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepthRef.current += 1;
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepthRef.current = 0;
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
        ref={inputRef}
        type="file"
      />

      {(uploadPhase === 'idle' || isDragging) && (
        <button
          aria-describedby={`${inputId}-help`}
          className="flex w-full items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--muted-strong)] shadow-sm transition-transform duration-200 ${
              isDragging ? '-translate-y-0.5 scale-110 text-[var(--accent)]' : ''
            }`}
          >
            <CloudUploadIcon />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5 text-sm">
            <span className="font-semibold text-[var(--foreground)]">
              {isDragging ? 'Drop to upload' : label}
            </span>
            <span className="text-[var(--muted)]">
              {isDragging ? 'Release your files here' : 'Drop images here or click to choose'}
            </span>
            <span className="text-xs text-[#8a9691]" id={`${inputId}-help`}>
              PNG, JPG, WebP, GIF or SVG · up to 10 files, 10 MB each
            </span>
            {onFilesSelected && (
              <span className="text-xs text-[#8a9691]">
                Preview only · uploaded after you click Create
              </span>
            )}
          </span>
        </button>
      )}

      {(uploadPhase === 'preparing' || uploadPhase === 'uploading') && (
        <div aria-live="polite" className="space-y-3">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--foreground)]">{fileLabel}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {uploadPhase === 'preparing' ? 'Preparing images…' : 'Uploading…'}
              </p>
            </div>
            <span className="shrink-0 font-medium tabular-nums text-[var(--muted-strong)]">
              {progress}%
            </span>
          </div>
          <div
            aria-label="Upload progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-black/[0.07]"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadPhase === 'error' && (
        <div aria-live="assertive" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="min-w-0">
            <p className="font-semibold text-[var(--danger)]">Upload failed</p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--muted-strong)]">{uploadError}</p>
          </div>
          <button
            className="h-8 shrink-0 rounded-full border border-[#f3b7b1] bg-white px-3 text-xs font-semibold text-[var(--danger)] shadow-sm transition hover:bg-[var(--danger-soft)]"
            onClick={resetUploader}
            type="button"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function EditPostPanel({
  actions,
  formAction,
  formId,
  post,
  postTypes,
}: {
  actions: React.ReactNode;
  formAction: (formData: FormData) => void;
  formId: string;
  post: AdminPost;
  postTypes: PostType[];
}) {
  const toast = useToast();
  const [editorImages, setEditorImages] = useState(() =>
    (post.images ?? []).map((image, index) => ({
      id: image.id,
      imageUrl: image.image_url,
      label:
        image.caption?.trim() ||
        (image.image_role === 'cover'
          ? 'Cover image'
          : `Gallery image ${index + 1}`),
    }))
  );

  async function addEditorImages(files: File[]) {
    const validationError = validateFiles(files);

    if (validationError) {
      toast.error(validationError);
      return [];
    }

    try {
      const preparedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            return await convertImageToWebp(file);
          } catch {
            return file;
          }
        })
      );
      const formData = new FormData();
      preparedFiles.forEach((file) => formData.append('files', file));

      const result = await uploadAndAttachImagesAction(post.id, formData);

      if (result.error || !result.uploads?.length) {
        toast.error(result.error ?? 'The selected images could not be uploaded.');
        return [];
      }

      const addedImages = result.uploads.map((upload, index) => ({
        id: upload.image_id,
        imageUrl: upload.url,
        label:
          files[index]?.name ?? `Post image ${editorImages.length + index + 1}`,
      }));

      setEditorImages((images) => [...images, ...addedImages]);
      toast.success(result.message ?? 'Images uploaded.');
      return addedImages;
    } catch {
      toast.error('The selected images could not be uploaded.');
      return [];
    }
  }

  return (
    <form
      action={formAction}
      className="glass-panel overflow-hidden"
      id={formId}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-white/35 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Post details</h2>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">{post.id}</p>
        </div>
        {actions}
      </div>
      <div className="p-5">
        <PostFields
          availableImages={editorImages}
          onAddImages={addEditorImages}
          post={post}
          postTypes={postTypes}
        />
      </div>
    </form>
  );
}

function GalleryPanel({ formId, post }: { formId: string; post: AdminPost }) {
  const [images, setImages] = useState(() => orderPostImages(post.images ?? []));
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

    const normalizedImages = normalizePostImageOrder(reorderedImages);

    imagesRef.current = normalizedImages;
    setImages(normalizedImages);
    setHasUnsavedOrder(true);
  }

  function setCoverImage(imageId: string) {
    const currentImages = imagesRef.current;
    const selectedImage = currentImages.find((image) => image.id === imageId);
    if (!selectedImage || currentImages[0]?.id === imageId) return;

    const normalizedImages = normalizePostImageOrder([
      selectedImage,
      ...currentImages.filter((image) => image.id !== imageId),
    ]);
    imagesRef.current = normalizedImages;
    setImages(normalizedImages);
    setHasUnsavedOrder(true);
  }

  return (
    <div className="glass-panel p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Post images</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add images to the story editor to show them in the article. The first
          image here is the cover.
        </p>
      </div>

      {hasUnsavedOrder && (
        <p className="mt-3 rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-xs font-medium text-[var(--warning)]">
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
                className="flex h-10 w-10 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full text-[var(--muted)] hover:bg-[#f0f4f1] hover:text-[var(--foreground)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
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
            onSetCover={() => setCoverImage(image.id)}
          />
        ))}
        {!images.length && (
          <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-[var(--muted)]">
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
  onSetCover,
}: {
  dragHandle: React.ReactNode;
  image: PostImage;
  isCover: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onSetCover: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <div
      className={`grid min-w-0 grid-cols-[auto_72px_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl border p-3 transition sm:grid-cols-[auto_72px_minmax(0,1fr)_auto] sm:items-center ${
        isDropTarget ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)]'
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
          <span className="absolute left-1 top-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Cover
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
          {isCover ? 'Cover image' : 'Gallery image'}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">Drag to change its position</p>
      </div>
      <div className="col-span-3 flex justify-end sm:col-span-1">
        {!isCover && (
          <button
            className="mr-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:-translate-y-px hover:bg-[var(--surface-muted)] hover:shadow-md"
            onClick={onSetCover}
            type="button"
          >
            Set as cover
          </button>
        )}
        <button
          className="rounded-full border border-[#f3b7b1] bg-white px-4 py-2 text-sm font-medium text-[var(--danger)] shadow-sm transition hover:-translate-y-px hover:bg-[var(--danger-soft)] hover:shadow-md disabled:translate-y-0 disabled:opacity-50"
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

function orderPostImages(images: PostImage[]) {
  return [...images].sort((left, right) => {
    if (left.image_role !== right.image_role) {
      return left.image_role === 'cover' ? -1 : 1;
    }
    return (left.sort_order ?? 0) - (right.sort_order ?? 0);
  });
}

function normalizePostImageOrder(images: PostImage[]) {
  return images.map((image, index) => ({
    ...image,
    image_role: index === 0 ? ('cover' as const) : ('gallery' as const),
    sort_order: index === 0 ? 0 : index - 1,
  }));
}

function DragHandleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CloudUploadIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M7.5 18H6a4 4 0 0 1-.55-7.96A6.5 6.5 0 0 1 18 11.5h.5a3.5 3.5 0 0 1 0 7H16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="m9 14 3-3 3 3m-3-3v9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="m5 12.5 4.25 4.25L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

function VisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M3 12s3.25-5 9-5 9 5 9 5-3.25 5-9 5-9-5-9-5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.7" />
      {!visible && <path d="m4 4 16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />}
    </svg>
  );
}

function HighlightIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24">
      <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function PostMenuButton({
  danger = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)] focus-visible:ring-red-200'
          : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:ring-black/10'
      }`}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      {label}
    </button>
  );
}

function PostFields({
  availableImages,
  onAddImages,
  onRemoveImage,
  post,
  postTypes,
}: {
  availableImages: Array<{ id: string; imageUrl: string; label: string }>;
  onAddImages?: (
    files: File[]
  ) =>
    | Array<{ id: string; imageUrl: string; label: string }>
    | Promise<Array<{ id: string; imageUrl: string; label: string }>>;
  onRemoveImage?: (imageId: string) => void;
  post?: AdminPost;
  postTypes: PostType[];
}) {
  const [selectedTypeId, setSelectedTypeId] = useState(
    String(post?.type_id ?? postTypes[0]?.id ?? '')
  );
  const [title, setTitle] = useState(post?.title ?? '');

  return (
    <div className="grid gap-4">
      <input
        name="published"
        type="hidden"
        value={post?.published ? 'on' : 'off'}
      />
      <input
        name="featured"
        type="hidden"
        value={post?.featured ? 'on' : 'off'}
      />
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Story title</span>
          <input
            aria-label="Story title"
            className="type-display h-auto w-full min-w-0 border-0 border-b border-[var(--line)] bg-transparent px-1 py-3 text-3xl font-bold tracking-[-0.035em] text-[var(--foreground)] outline-none transition placeholder:text-[#a1a1aa] focus:border-[var(--accent)] sm:text-4xl"
            maxLength={500}
            name="title"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;

              event.preventDefault();
              const editor = document.getElementById('article-story-editor');
              const firstLine = editor?.querySelector<HTMLElement>('p, h2, h3, h4');
              if (!editor) return;

              editor.focus();
              if (firstLine) {
                const range = document.createRange();
                range.selectNodeContents(firstLine);
                range.collapse(true);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            }}
            placeholder="Write a clear, memorable title…"
            required
            value={title}
          />
        </label>
        <div className="grid w-full shrink-0 gap-1.5 text-xs font-semibold text-[var(--muted-strong)] sm:w-52">
          <span>Post type</span>
          <FilterListbox
            ariaLabel="Post type"
            className="sm:w-full"
            name="type_id"
            onChange={setSelectedTypeId}
            options={postTypes.map((type) => ({
              label: type.name,
              value: String(type.id),
            }))}
            value={selectedTypeId}
          />
        </div>
      </div>

      <PostBlockEditor
        availableImages={availableImages}
        initialDocument={post?.content_json}
        legacyContent={post?.content}
        onAddImages={onAddImages}
        onRemoveImage={onRemoveImage}
      />

    </div>
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
      className="h-[72px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] bg-cover bg-center"
      role="img"
      style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
    />
  );
}

function StatusPill({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-medium ${
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
          : 'bg-[#ececf1] text-[#6f6f6f]'
      }`}
    >
      {label}
    </span>
  );
}

function createGalleryDraft(file: File): GalleryDraft {
  return {
    key: crypto.randomUUID(),
    file,
    imageUrl: URL.createObjectURL(file),
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

function getTypeName(post: AdminPost, postTypes: PostType[]) {
  return (
    post.type?.name ??
    postTypes.find((type) => type.id === post.type_id)?.name ??
    post.type_slug ??
    'Unknown'
  );
}

function getContentPreview(
  content?: string | null,
  contentJson?: AdminPost['content_json'],
  maxLength = 140
) {
  const document = normalizeContentDocument(contentJson, content);
  const normalized = plainTextFromDocument(document).replace(/\s+/g, ' ').trim();

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
