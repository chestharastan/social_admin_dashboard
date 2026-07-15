import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_TOKEN_COOKIE } from '@/app/lib/auth';
import {
  DashboardSidebar,
  MobileDashboardHeader,
} from '@/components/dashboard/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  if (!cookieStore.has(AUTH_TOKEN_COOKIE)) {
    redirect('/auth');
  }

  return (
    <main className="dashboard-canvas min-h-screen text-[var(--foreground)]">
      <div className="min-h-screen lg:flex">
        <DashboardSidebar />
        <section className="min-w-0 flex-1 overflow-x-hidden">
          <MobileDashboardHeader />
          {children}
        </section>
      </div>
    </main>
  );
}
