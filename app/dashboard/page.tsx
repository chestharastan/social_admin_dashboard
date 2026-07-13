import PostManager from '@/app/dashboard/post-manager';
import { getDashboardPostsData } from '@/app/dashboard/posts-api';

export default async function DashboardPage() {
  const { posts, postTypes, postsError, postTypesError } =
    await getDashboardPostsData();

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Posts dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Select a post card to view and manage its details.
        </p>
      </header>

      <PostManager
        initialPosts={posts}
        postTypes={postTypes}
        postsError={postsError}
        postTypesError={postTypesError}
      />
    </div>
  );
}
