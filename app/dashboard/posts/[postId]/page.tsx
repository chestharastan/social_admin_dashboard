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
    <div className="flex w-full flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-700"
          href="/dashboard"
        >
          <span aria-hidden="true">←</span>
          Back to posts
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
          Post details
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {postResult.data?.title ?? 'Post unavailable'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Edit the post content, status, and images.
        </p>
      </header>

      {(postResult.error || postTypesResult.error) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {postResult.error && <p>Post: {postResult.error}</p>}
          {postTypesResult.error && <p>Types: {postTypesResult.error}</p>}
        </div>
      )}

      {postResult.data ? (
        <PostEditor post={postResult.data} postTypes={postTypes} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Post could not be loaded</h2>
          <p className="mt-2 text-sm text-slate-500">
            Return to the dashboard and choose another post.
          </p>
        </div>
      )}
    </div>
  );
}
