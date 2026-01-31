'use client';

import Link from 'next/link';

export function AppFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">产品</h3>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><Link href="#pricing" className="hover:text-[var(--foreground)] transition-colors">定价</Link></li>
              <li><Link href="#product" className="hover:text-[var(--foreground)] transition-colors">模板</Link></li>
              <li><Link href="/create" className="hover:text-[var(--foreground)] transition-colors">创建报告</Link></li>
              <li><Link href="/reports" className="hover:text-[var(--foreground)] transition-colors">我的报告</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">公司</h3>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><Link href="#about" className="hover:text-[var(--foreground)] transition-colors">关于</Link></li>
              <li><Link href="/" className="hover:text-[var(--foreground)] transition-colors">帮助</Link></li>
              <li><Link href="/" className="hover:text-[var(--foreground)] transition-colors">社区</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">社交</h3>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">Instagram</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">LinkedIn</a></li>
              <li><a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">X</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">法律</h3>
            <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
              <li><Link href="/" className="hover:text-[var(--foreground)] transition-colors">隐私政策</Link></li>
              <li><Link href="/" className="hover:text-[var(--foreground)] transition-colors">服务条款</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex h-7 items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)]" />
            <span className="text-sm font-medium text-[var(--foreground)]">数据报告</span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} · AI 驱动的数据报告生成
          </p>
        </div>
      </div>
    </footer>
  );
}
