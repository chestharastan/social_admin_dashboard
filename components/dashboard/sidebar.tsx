'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { handleLogoutAction } from '@/app/auth/actions';

type NavigationItem = {
  label: string;
  icon: ComponentType;
  href?: string;
};

const NAV_ITEMS: NavigationItem[] = [
  { label: 'Posts', icon: PostsIcon, href: '/dashboard' },
  { label: 'Generate QR Code', icon: QrCodeIcon, href: '/dashboard/qr-code' },
  { label: 'Accounts', icon: AccountsIcon },
  { label: 'Reports', icon: ReportsIcon },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item): item is NavigationItem & { href: string } => Boolean(item.href),
);

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setIsAccountOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAccountOpen]);

  return (
    <aside
      className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-[#e7e4de] bg-[#faf9f6] transition-[width,padding] duration-300 ease-out lg:flex ${
        isCollapsed ? 'w-16 px-2 py-5' : 'w-[268px] px-5 py-6'
      }`}
    >
      <SidebarBrand
        collapsed={isCollapsed}
        onCollapse={() => {
          setIsCollapsed(true);
          setIsAccountOpen(false);
        }}
        onExpand={() => {
          setIsCollapsed(false);
          setIsAccountOpen(false);
        }}
      />

      <nav
        aria-label="Dashboard navigation"
        className={isCollapsed ? 'mt-8 flex-1 space-y-2' : 'mt-9 flex-1 space-y-2'}
      >
        <p
          className={`overflow-hidden whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#99958d] transition-[max-height,opacity,margin] duration-300 ${
            isCollapsed ? 'mb-0 max-h-0 opacity-0' : 'mb-3 max-h-6 opacity-100'
          }`}
        >
          Main menu
        </p>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? isRouteActive(pathname, item.href) : false;
          const sharedClassName = `group relative flex h-11 w-full items-center rounded-xl text-sm font-medium transition-[background-color,color,gap,padding] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]/35 ${
            isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
          }`;

          if (!item.href) {
            return (
              <button
                aria-disabled="true"
                className={`${sharedClassName} cursor-not-allowed text-[#aaa69e]`}
                disabled
                key={item.label}
                type="button"
              >
                <Icon />
                <span
                  className={`overflow-hidden whitespace-nowrap text-left transition-[max-width,opacity] duration-300 ${
                    isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100'
                  }`}
                >
                  {item.label}
                </span>
                {!isCollapsed && (
                  <span className="ml-auto rounded-full bg-[#efede8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#99958d]">
                    Soon
                  </span>
                )}
                {isCollapsed && <SidebarTooltip label={`${item.label} · Soon`} />}
              </button>
            );
          }

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={`${sharedClassName} ${
                isActive
                  ? 'bg-[#eeeaff] text-[#5736dc] shadow-[inset_0_0_0_1px_rgba(109,74,255,0.08)]'
                  : 'text-[#59564f] hover:bg-[#f0eee9] hover:text-[#23221f]'
              }`}
              href={item.href}
              key={item.label}
              prefetch
            >
              <Icon />
              <span
                className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ${
                  isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[170px] opacity-100'
                }`}
              >
                {item.label}
              </span>
              {isCollapsed && <SidebarTooltip label={item.label} />}
            </Link>
          );
        })}
      </nav>

      <div
        className={`mt-auto border-t border-[#e7e4de] ${
          isCollapsed ? 'flex justify-center pt-4' : 'pt-3'
        }`}
        ref={accountRef}
      >
        <div className="relative w-full">
          {isAccountOpen && (
            <div
              aria-label="Account menu"
              className={`absolute z-50 w-[248px] rounded-2xl border border-[#e7e4de] bg-white p-2 shadow-[0_18px_48px_rgba(36,31,24,0.14)] ${
                isCollapsed ? 'bottom-0 left-full ml-4' : 'bottom-full left-0 mb-3'
              }`}
              id="dashboard-account-menu"
              role="menu"
            >
              <div className="flex items-center gap-3 px-2 py-2.5">
                <AccountAvatar />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#23221f]">
                    UKMAC Admin
                  </p>
                  <p className="truncate text-xs text-[#858078]">
                    Website content manager
                  </p>
                </div>
              </div>

              <div className="mt-1 border-t border-[#eeece7] pt-1">
                <form action={handleLogoutAction}>
                  <button
                    className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                    role="menuitem"
                    type="submit"
                  >
                    <LogoutIcon />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          )}

          <button
            aria-controls="dashboard-account-menu"
            aria-expanded={isAccountOpen}
            aria-haspopup="menu"
            aria-label="Open account menu"
            className={`group relative flex h-12 items-center rounded-xl text-left transition hover:bg-[#f0eee9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]/35 ${
              isCollapsed ? 'w-full justify-center' : 'w-full justify-between px-2'
            } ${isAccountOpen ? 'bg-[#f0eee9]' : ''}`}
            onClick={() => setIsAccountOpen((current) => !current)}
            type="button"
          >
            <span className={`flex min-w-0 items-center ${isCollapsed ? '' : 'gap-3'}`}>
              <AccountAvatar />
              <span
                className={`min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ${
                  isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
                }`}
              >
                <span className="block truncate text-sm font-medium text-[#302e2a]">
                  Admin account
                </span>
                <span className="block truncate text-xs text-[#858078]">
                  Account menu
                </span>
              </span>
            </span>
            {!isCollapsed && (
              <ChevronDownIcon rotated={isAccountOpen} />
            )}
            {isCollapsed && !isAccountOpen && <SidebarTooltip label="Admin account" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileDashboardHeader() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e7e4de] bg-[#faf9f6]/95 px-4 pt-4 backdrop-blur sm:px-6 lg:static lg:border-b-0 lg:bg-transparent lg:px-8 lg:pt-6 lg:backdrop-blur-none">
      <BreadcrumbTrail breadcrumbs={breadcrumbs} className="hidden lg:flex" />

      <div className="flex items-center justify-between gap-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6d4aff] text-sm font-bold text-white shadow-sm shadow-[#6d4aff]/20">
            U
          </span>
          <div className="min-w-0">
            <BreadcrumbTrail
              breadcrumbs={breadcrumbs}
              className="text-[11px] text-[#99958d]"
            />
            <p className="truncate text-sm font-semibold text-[#23221f]">
              UKMAC Admin
            </p>
          </div>
        </div>

        <form action={handleLogoutAction}>
          <button
            className="flex h-9 items-center gap-2 rounded-xl border border-[#dedbd4] bg-white px-3 text-sm font-medium text-[#59564f] shadow-sm transition hover:border-[#cbc7bf] hover:bg-[#f4f2ed] hover:text-[#23221f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]/35"
            type="submit"
          >
            <LogoutIcon />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>

      <nav
        aria-label="Mobile dashboard navigation"
        className="mt-3 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isRouteActive(pathname, item.href);

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]/35 ${
                isActive
                  ? 'bg-[#eeeaff] text-[#5736dc]'
                  : 'bg-white text-[#666159] hover:bg-[#f0eee9] hover:text-[#23221f]'
              }`}
              href={item.href}
              key={item.href}
              prefetch
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

type Breadcrumb = {
  href?: string;
  label: string;
};

function getBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname.startsWith('/dashboard/qr-code')) {
    return [{ href: '/dashboard/qr-code', label: 'QR codes' }];
  }

  if (pathname === '/dashboard/posts/new') {
    return [
      { href: '/dashboard', label: 'Posts' },
      { label: 'Create post' },
    ];
  }

  if (pathname.startsWith('/dashboard/posts/')) {
    return [
      { href: '/dashboard', label: 'Posts' },
      { label: 'Edit post' },
    ];
  }

  return [{ href: '/dashboard', label: 'Posts' }];
}

function BreadcrumbTrail({
  breadcrumbs,
  className = '',
}: {
  breadcrumbs: Breadcrumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex min-w-0 items-center gap-1 text-xs text-[var(--muted)] ${className}`}
    >
      <span className="shrink-0">Page</span>
      {breadcrumbs.map((item, index) => {
        const isCurrent = index === breadcrumbs.length - 1;

        return (
          <span className="flex min-w-0 items-center gap-1" key={item.label}>
            <span aria-hidden="true">/</span>
            {item.href ? (
              <Link
                aria-current={isCurrent ? 'page' : undefined}
                className="truncate font-medium text-[#59564f] transition hover:text-[#5736dc] hover:underline"
                href={item.href}
                prefetch
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium text-[#59564f]">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function SidebarBrand({
  collapsed,
  onCollapse,
  onExpand,
}: {
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}) {
  if (collapsed) {
    return (
      <button
        aria-label="Expand sidebar"
        className="group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#6d4aff] text-white shadow-sm shadow-[#6d4aff]/20 transition hover:bg-[#5e3ee8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f6]"
        onClick={onExpand}
        type="button"
      >
        <span className="text-sm font-bold transition group-hover:opacity-0 group-focus-visible:opacity-0">
          U
        </span>
        <ExpandSidebarIcon />
        <SidebarTooltip label="Open sidebar" />
      </button>
    );
  }

  return (
    <div className="flex h-10 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6d4aff] text-sm font-bold text-white shadow-sm shadow-[#6d4aff]/20">
          U
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#23221f]">
            UKMAC Admin
          </span>
          <span className="block truncate text-xs text-[#858078]">
            Content manager
          </span>
        </span>
      </div>
      <button
        aria-label="Collapse sidebar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#777269] transition hover:bg-[#f0eee9] hover:text-[#23221f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff]/35"
        onClick={onCollapse}
        type="button"
      >
        <CollapseSidebarIcon />
      </button>
    </div>
  );
}

function isRouteActive(pathname: string, href: string) {
  return href === '/dashboard'
    ? pathname === '/dashboard' || pathname.startsWith('/dashboard/posts/')
    : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#23221f] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  );
}

function AccountAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e1f2ed] text-[#176b60]">
      <UserIcon />
    </span>
  );
}

function PostsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function AccountsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 19v1M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 11.5a3 3 0 0 1 4 2.83V16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function QrCodeIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M14 14h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z" fill="currentColor" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
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

function UserIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M19 20a7 7 0 0 0-14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronDownIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-[#99958d] transition-transform ${rotated ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function CollapseSidebarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="4" />
      <path d="M9 4v16m5-5-3-3 3-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function ExpandSidebarIcon() {
  return (
    <svg aria-hidden="true" className="absolute h-5 w-5 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" fill="none" viewBox="0 0 24 24">
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="4" />
      <path d="M9 4v16m2-5 3-3-3-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}
