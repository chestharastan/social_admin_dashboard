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
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <section className="min-w-0 flex-1">
          <MobileDashboardHeader />
          {children}
        </section>
      </div>
    </main>
  );
}
