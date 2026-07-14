import { CreatePostForm } from '@/app/dashboard/post-manager';
import {
  FALLBACK_POST_TYPES,
  fetchPostTypes,
} from '@/app/dashboard/posts-api';

export default async function NewPostPage() {
  const postTypesResult = await fetchPostTypes();
  const postTypes = postTypesResult.data.length
    ? postTypesResult.data
    : FALLBACK_POST_TYPES;

  return (
    <div className="flex w-full flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
          Create post
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Create a new website post and arrange its images before publishing.
        </p>
      </header>

      {postTypesResult.error && (
        <div className="rounded-md border border-[#f4d49a] bg-[var(--warning-soft)] px-4 py-3 text-sm font-medium text-[var(--warning)]">
          Types: {postTypesResult.error}
        </div>
      )}

      <CreatePostForm postTypes={postTypes} />
    </div>
  );
}
