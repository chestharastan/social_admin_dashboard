import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { handleLogoutAction } from '@/app/auth/actions';
import { AUTH_TOKEN_COOKIE } from '@/app/lib/auth';
import PostManager from '@/app/dashboard/post-manager';
import { getDashboardPostsData } from '@/app/dashboard/posts-api';

export default async function DashboardPage() {
  const cookieStore = await cookies();

  if (!cookieStore.has(AUTH_TOKEN_COOKIE)) {
    redirect('/auth');
  }

  const { posts, postTypes, postsError, postTypesError } =
    await getDashboardPostsData();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <DashboardSidebar />

        <section className="min-w-0 flex-1">
          <MobileSidebar />

          <div className="flex w-full flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
                  Dashboard
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Posts dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Create, edit, publish, feature, and manage gallery images for
                  website posts.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Post types</p>
                  <p className="mt-1 text-xl font-semibold">{postTypes.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Loaded posts</p>
                  <p className="mt-1 text-xl font-semibold">{posts.length}</p>
                </div>
              </div>
            </header>

            <PostManager
              initialPosts={posts}
              postTypes={postTypes}
              postsError={postsError}
              postTypesError={postTypesError}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-slate-950 px-4 py-5 text-white shadow-xl md:flex md:flex-col">
      <SidebarContent />
    </aside>
  );
}

function MobileSidebar() {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">UKMAC Admin</p>
          <p className="text-xs text-slate-500">Posts</p>
        </div>
        <form action={handleLogoutAction}>
          <button
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"
            type="submit"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}

function SidebarContent() {
  const navItems = [
    { label: 'Posts', active: true },
    { label: 'Accounts', active: false },
    { label: 'Reports', active: false },
  ];

  return (
    <>
      <div className="px-2">
        <p className="text-base font-semibold text-white">UKMAC Admin</p>
        <p className="mt-1 text-xs text-slate-400">Website content manager</p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <button
            className={`h-10 rounded-lg px-3 text-left text-sm font-medium transition ${
              item.active
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/30'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            key={item.label}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <form action={handleLogoutAction}>
        <button
          className="h-10 w-full rounded-lg border border-white/10 px-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          type="submit"
        >
          Logout
        </button>
      </form>
    </>
  );
}
