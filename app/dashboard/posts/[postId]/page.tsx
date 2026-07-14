import Link from 'next/link';
import { PostEditor } from '@/app/dashboard/post-manager';
import {
  FALLBACK_POST_TYPES,
  fetchAdminPost,
  fetchPostTypes,
} from '@/app/dashboard/posts-api';

export default async function PostDetailsPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const [postResult, postTypesResult] = await Promise.all([
    fetchAdminPost(postId),
    fetchPostTypes(),
  ]);
  const postTypes = postTypesResult.data.length
    ? postTypesResult.data
    : FALLBACK_POST_TYPES;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
            {postResult.data?.title ?? 'Post unavailable'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Edit the post content, publishing status, and image order.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--muted-strong)] shadow-sm transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            href="/dashboard"
          >
            <span aria-hidden="true">←</span>
            Back to posts
          </Link>
        </div>
      </header>

      {(postResult.error || postTypesResult.error) && (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-medium text-[var(--warning)]">
          {postResult.error && <p>Post: {postResult.error}</p>}
          {postTypesResult.error && <p>Types: {postTypesResult.error}</p>}
        </div>
      )}

      {postResult.data ? (
        <PostEditor post={postResult.data} postTypes={postTypes} />
      ) : (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Post could not be loaded
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Return to the dashboard and choose another post.
          </p>
        </div>
      )}
    </div>
  );
}
