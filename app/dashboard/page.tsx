// app/dashboard/page.tsx
import PostManager from '@/app/dashboard/post-manager';
import { getDashboardPostsData } from '@/app/dashboard/posts-api';
import { KpiCard } from '@/components/ui/kpi-card';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ createdPost?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const createdPostId = Array.isArray(resolvedSearchParams.createdPost)
    ? resolvedSearchParams.createdPost[0]
    : resolvedSearchParams.createdPost;
  const { posts, postTypes, postsError, postTypesError } =
    await getDashboardPostsData();
  const publishedPosts = posts.filter((post) => post.published === true).length;
  const featuredPosts = posts.filter((post) => post.featured === true).length;
  const stats = [
    {
      label: 'Total posts',
      value: posts.length,
      helper: 'All content in your library',
    },
    {
      label: 'Published',
      value: publishedPosts,
      helper: 'Currently visible to visitors',
    },
    {
      label: 'Drafts',
      value: posts.length - publishedPosts,
      helper: 'Waiting to be published',
    },
    {
      label: 'Featured',
      value: featuredPosts,
      helper: 'Highlighted across the website',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="type-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Review your content at a glance, then create, organize, and publish posts.
          </p>
        </div>
      </header>

      <section aria-labelledby="post-overview-heading">
        <h2 className="sr-only" id="post-overview-heading">
          Post overview
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <KpiCard key={stat.label} {...stat} />
          ))}
        </dl>
      </section>

      <PostManager
        createdPostId={createdPostId}
        initialPosts={posts}
        postTypes={postTypes}
        postsError={postsError}
        postTypesError={postTypesError}
      />
    </div>
  );
}
