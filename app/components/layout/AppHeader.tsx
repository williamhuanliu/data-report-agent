'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ThemeToggle } from '../ThemeToggle';

export function AppHeader() {
  const { data: session, status } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    if (userMenuOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-lg"
          aria-label="首页"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            数据报告
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="主导航">
          <a
            href="#product"
            className="hidden md:inline-flex h-9 items-center px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[var(--foreground)] transition-colors rounded-lg"
          >
            产品
          </a>
          <a
            href="#solutions"
            className="hidden md:inline-flex h-9 items-center px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[var(--foreground)] transition-colors rounded-lg"
          >
            场景
          </a>
          <a
            href="#about"
            className="hidden md:inline-flex h-9 items-center px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[var(--foreground)] transition-colors rounded-lg"
          >
            关于
          </a>
          <Link
            href="/reports"
            className="hidden md:inline-flex h-9 items-center px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[var(--foreground)] transition-colors rounded-lg"
          >
            我的报告
          </Link>
          <ThemeToggle />
          {status === 'loading' ? (
            <span className="h-9 w-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" aria-hidden />
          ) : session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--surface)] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                免费开始
              </Link>
              <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="用户菜单"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white text-xs font-medium">
                  {(session.user.email ?? session.user.name ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[120px] truncate">{session.user.email ?? session.user.name}</span>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 min-w-[180px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg z-50"
                  role="menu"
                >
                  <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 border-b border-[var(--border)]">
                    {session.user.email ?? session.user.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
                    role="menuitem"
                  >
                    退出登录
                  </button>
                </div>
              )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                登录
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--surface)] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
              >
                免费开始
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
