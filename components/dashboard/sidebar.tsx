'use client';

import Image from 'next/image';
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
      className={`glass-sidebar sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r transition-[width,padding] duration-300 ease-out lg:flex ${
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
        className={isCollapsed ? 'mt-8 flex-1 space-y-1' : 'mt-9 flex-1 space-y-1'}
      >
        <p
          className={`overflow-hidden whitespace-nowrap px-2.5 text-xs font-medium text-[var(--muted)] transition-[max-height,opacity,margin] duration-300 ${
            isCollapsed ? 'mb-0 max-h-0 opacity-0' : 'mb-3 max-h-6 opacity-100'
          }`}
        >
          Workspace
        </p>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? isRouteActive(pathname, item.href) : false;
          const sharedClassName = `group relative flex h-10 w-full items-center rounded-lg text-[13px] font-medium transition-[background-color,color,gap,padding,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181b]/25 ${
            isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/40 text-[#99958d]">
                  <Icon />
                </span>
                <span
                  className={`overflow-hidden whitespace-nowrap text-left transition-[max-width,opacity] duration-300 ${
                    isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100'
                  }`}
                >
                  {item.label}
                </span>
                {!isCollapsed && (
                  <span className="ml-auto rounded-md bg-white/50 px-1.5 py-0.5 text-[9px] font-medium text-[#8b9187]">
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
                  ? 'bg-white/72 text-[#27272a] shadow-[inset_0_0_0_0.5px_rgba(24,24,27,0.08),0_5px_16px_rgba(24,24,27,0.055)]'
                  : 'text-[#59564f] hover:bg-white/55 hover:text-[#23221f]'
              }`}
              href={item.href}
              key={item.label}
              prefetch
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? 'bg-white/85 text-[#3f3f46] shadow-[0_1px_3px_rgba(24,24,27,0.09)]'
                    : 'text-[#777d74] group-hover:bg-white/70 group-hover:text-[var(--accent-strong)]'
                }`}
              >
                <Icon />
              </span>
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
        className={`mt-auto border-t border-[var(--line)] ${
          isCollapsed ? 'flex justify-center pt-4' : 'pt-3'
        }`}
        ref={accountRef}
      >
        <div className="relative w-full">
          {isAccountOpen && (
            <div
              aria-label="Account menu"
              className={`glass-panel absolute z-50 w-[248px] p-2 ${
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

              <div className="mt-1 border-t border-[var(--line)] pt-1">
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
            className={`group relative flex h-12 items-center rounded-xl text-left transition hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181b]/35 ${
              isCollapsed ? 'w-full justify-center' : 'w-full justify-between px-2'
            } ${isAccountOpen ? 'bg-white/65' : ''}`}
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mobileSidebarRef = useRef<HTMLElement>(null);
  const mobileSidebarTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      mobileSidebarRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
        window.requestAnimationFrame(() => mobileSidebarTriggerRef.current?.focus());
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileSidebarOpen]);

  function closeMobileSidebar(restoreFocus = true) {
    setIsMobileSidebarOpen(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileSidebarTriggerRef.current?.focus());
    }
  }

  return (
    <>
      <header className="glass-bar dashboard-header sticky top-0 z-30 border-b px-4 py-3 shadow-[0_1px_16px_rgba(24,24,27,0.045)] sm:px-6 lg:static lg:border-b-0 lg:px-8 lg:pb-0 lg:pt-6">
        <BreadcrumbTrail breadcrumbs={breadcrumbs} className="hidden lg:flex" />

        <div className="flex items-center gap-3 lg:hidden">
          <button
            aria-controls="mobile-dashboard-sidebar"
            aria-expanded={isMobileSidebarOpen}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white/65 text-[#71717a] shadow-[0_6px_18px_rgba(24,24,27,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:bg-white/85 hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181b]/35"
            onClick={() => setIsMobileSidebarOpen(true)}
            ref={mobileSidebarTriggerRef}
            type="button"
          >
            <CollapseSidebarIcon />
          </button>

          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <Image
              alt="UKMAC Admin"
              className="h-full w-full object-contain"
              height={36}
              src="/logo/UKMAC_Logo.webp"
              width={36}
            />
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
      </header>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation menu"
            className="glass-scrim absolute inset-0"
            onClick={() => closeMobileSidebar()}
            type="button"
          />

          <aside
            aria-label="Dashboard navigation"
            aria-modal="true"
            className="glass-sidebar glass-drawer relative z-10 flex h-[100dvh] w-[min(286px,calc(100vw-3rem))] flex-col border-r px-5 py-6"
            id="mobile-dashboard-sidebar"
            ref={mobileSidebarRef}
            role="dialog"
          >
            <SidebarBrand
              collapsed={false}
              collapseLabel="Close navigation menu"
              onCollapse={() => closeMobileSidebar()}
              onExpand={() => undefined}
            />

            <nav aria-label="Mobile dashboard navigation" className="mt-9 flex-1 space-y-1 overflow-y-auto">
              <p className="mb-3 px-2.5 text-xs font-medium text-[var(--muted)]">
                Workspace
              </p>

              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.href
                  ? isRouteActive(pathname, item.href)
                  : false;
                const itemClassName =
                  'group relative flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181b]/25';

                if (!item.href) {
                  return (
                    <button
                      aria-disabled="true"
                      className={`${itemClassName} cursor-not-allowed text-[#aaa69e]`}
                      disabled
                      key={item.label}
                      type="button"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/40 text-[#99958d]">
                        <Icon />
                      </span>
                      <span>{item.label}</span>
                      <span className="ml-auto rounded-md bg-white/50 px-1.5 py-0.5 text-[9px] font-medium text-[#8b9187]">
                        Soon
                      </span>
                    </button>
                  );
                }

                return (
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    className={`${itemClassName} ${
                      isActive
                        ? 'bg-white/72 text-[#27272a] shadow-[inset_0_0_0_0.5px_rgba(24,24,27,0.08),0_5px_16px_rgba(24,24,27,0.055)]'
                        : 'text-[#59564f] hover:bg-white/55 hover:text-[#23221f]'
                    }`}
                    href={item.href}
                    key={item.label}
                    onClick={() => closeMobileSidebar(false)}
                    prefetch
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-white/85 text-[#3f3f46] shadow-[0_1px_3px_rgba(24,24,27,0.09)]'
                          : 'text-[#777d74] group-hover:bg-white/70 group-hover:text-[var(--accent-strong)]'
                      }`}
                    >
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex items-center gap-3 px-2 pb-3">
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
              <form action={handleLogoutAction}>
                <button
                  className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                  type="submit"
                >
                  <LogoutIcon />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
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

  if (/^\/dashboard\/posts\/[^/]+\/view\/?$/.test(pathname)) {
    return [
      { href: '/dashboard', label: 'Posts' },
      { label: 'View post' },
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
                className="truncate font-medium text-[#59564f] transition hover:text-[var(--accent-strong)] hover:underline"
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
  collapseLabel = 'Collapse sidebar',
  onCollapse,
  onExpand,
}: {
  collapsed: boolean;
  collapseLabel?: string;
  onCollapse: () => void;
  onExpand: () => void;
}) {
  if (collapsed) {
    return (
      <button
        aria-label="Expand sidebar"
        className="group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181b]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60"
        onClick={onExpand}
        type="button"
      >
        <Image
          alt="UKMAC Admin"
          className="h-full w-full object-contain transition group-hover:opacity-0 group-focus-visible:opacity-0"
          height={40}
          src="/logo/UKMAC_Logo.webp"
          width={40}
        />
        <ExpandSidebarIcon />
        <SidebarTooltip label="Open sidebar" />
      </button>
    );
  }

  return (
    <div className="flex h-10 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          <Image
            alt="UKMAC Admin"
            className="h-full w-full object-contain"
            height={40}
            src="/logo/UKMAC_Logo.webp"
            width={40}
          />
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
        aria-label={collapseLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#71717a] transition hover:bg-white/60 hover:text-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181b]/35"
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
    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#18181b]/85 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur-xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  );
}

function AccountAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
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
      <path d="M9 4v16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function ExpandSidebarIcon() {
  return (
    <svg aria-hidden="true" className="absolute h-5 w-5 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" fill="none" viewBox="0 0 24 24">
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="4" />
      <path d="M9 4v16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}
