import Link from 'next/link';
import {
  normalizeContentDocument,
  referencedMediaIds,
} from '@/app/dashboard/post-content';
import { fetchAdminPost } from '@/app/dashboard/posts-api';
import { PostContent } from '@/components/posts/post-content';

export default async function ViewPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const postResult = await fetchAdminPost(postId);
  const post = postResult.data;

  if (!post) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 text-center">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            Post could not be loaded
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {postResult.error ?? 'This post is unavailable.'}
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const images = [...(post.images ?? [])].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
  );

  if (!images.length && post.cover_image) {
    images.push({
      id: 'cover',
      image_url: post.cover_image,
      image_role: 'cover',
      sort_order: 0,
    });
  }

  const typeName = post.type?.name ?? post.type_slug ?? 'Post';
  const contentDocument = normalizeContentDocument(post.content_json, post.content);
  const referencedImageIds = new Set(referencedMediaIds(contentDocument));
  const coverImage =
    images.find((image) => image.image_role === 'cover') ?? images[0];
  const coverIsPlacedInArticle = coverImage
    ? referencedImageIds.has(coverImage.id)
    : false;

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-12 pt-3 sm:px-6 sm:pt-4 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link
          className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
          href="/dashboard"
        >
          ← Back to posts
        </Link>
        <Link
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-[var(--accent-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2"
          href={`/dashboard/posts/${post.id}`}
        >
          Edit post
        </Link>
      </header>

      <article className="mx-auto mt-10 w-full max-w-[680px] sm:mt-14">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span
            className={`rounded-full px-2.5 py-1 ${
              post.published
                ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                : 'bg-[#ececf1] text-[#6f6f6f]'
            }`}
          >
            {post.published ? 'Published' : 'Draft'}
          </span>
          {post.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[var(--brand-strong)]">
              <StarIcon /> Featured
            </span>
          )}
          <span className="rounded-full bg-[#ececf1] px-2.5 py-1 text-[#565869]">
            {typeName}
          </span>
        </div>

        <h1 className="type-display mt-5 break-words text-[clamp(2rem,6vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.04em] text-[var(--foreground)]">
          {post.title}
        </h1>

        {coverImage && !coverIsPlacedInArticle && (
          <figure className="mt-9">
            {/* Backend image URLs are validated storage URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${post.title} cover`}
              className="h-auto w-full rounded-[0.85rem] bg-[var(--surface-muted)]"
              decoding="async"
              src={coverImage.image_url}
            />
          </figure>
        )}

        <div className="mt-9">
          <PostContent
            content={post.content}
            contentJson={contentDocument}
            images={images}
          />
        </div>
      </article>
    </div>
  );
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z" />
    </svg>
  );
}
