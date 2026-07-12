import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { handleLogoutAction } from '@/app/auth/actions';
import { AUTH_TOKEN_COOKIE } from '@/app/lib/auth';

export default async function DashboardPage() {
  const cookieStore = await cookies();

  if (!cookieStore.has(AUTH_TOKEN_COOKIE)) {
    redirect('/auth');
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8 text-gray-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Welcome to your admin dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Login was successful and your auth token is stored in an HttpOnly
              cookie.
            </p>
          </div>

          <form action={handleLogoutAction}>
            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              type="submit"
            >
              Logout
            </button>
          </form>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ['Posts', 'Ready for social content management'],
            ['Accounts', 'Connect account controls here'],
            ['Reports', 'Add analytics and campaign stats'],
          ].map(([title, description]) => (
            <div
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              key={title}
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
