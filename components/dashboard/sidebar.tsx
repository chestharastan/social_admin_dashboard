'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { handleLogoutAction } from '@/app/auth/actions';

const NAV_ITEMS = [
  { label: 'Posts', icon: PostsIcon, href: '/dashboard' },
  { label: 'Generate QR Code', icon: QrCodeIcon, href: '/dashboard/qr-code' },
  { label: 'Accounts', icon: AccountsIcon, href: undefined },
  { label: 'Reports', icon: ReportsIcon, href: undefined },
];

export function DashboardSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 text-slate-950 shadow-sm md:flex md:flex-col">
      <SidebarContent />
    </aside>
  );
}

export function MobileDashboardHeader() {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <Brand compact />
        <form action={handleLogoutAction}>
          <button
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
  const pathname = usePathname();

  return (
    <>
      <Brand />

      <nav aria-label="Dashboard navigation" className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href
            ? item.href === '/dashboard'
              ? pathname === '/dashboard' || pathname.startsWith('/dashboard/posts/')
              : pathname.startsWith(item.href)
            : false;

          const className = `flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition ${
            isActive
              ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-950/5'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
          }`;

          return item.href ? (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={className}
              href={item.href}
              key={item.label}
            >
              <Icon />
              {item.label}
            </Link>
          ) : (
            <button className={className} key={item.label} type="button">
              <Icon />
              {item.label}
            </button>
          );
        })}
      </nav>

      <form action={handleLogoutAction}>
        <button
          className="flex h-10 w-full items-center gap-3 rounded-lg border border-slate-200 px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          type="submit"
        >
          <LogoutIcon />
          Logout
        </button>
      </form>
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex items-center gap-3' : 'flex items-center gap-3 px-2'}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-950/30">
        U
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-950">
          UKMAC Admin
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {compact ? 'Posts' : 'Website content manager'}
        </span>
      </span>
    </div>
  );
}

function PostsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function AccountsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 11.5a3 3 0 0 1 4 2.83V16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function QrCodeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M14 14h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z" fill="currentColor" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M5 20V10M12 20V4M19 20v-7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}