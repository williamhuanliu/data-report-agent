'use client';

import Link from 'next/link';
import { useState } from 'react';

interface ReportNavProps {
  reportId?: string;
}

export function ReportNav({ reportId }: ReportNavProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      // 分享时复制干净链接（不含 manage 等参数），打开时不显示顶部栏
      const url = reportId
        ? `${window.location.origin}/reports/${reportId}`
        : window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <nav className="print:hidden sticky top-0 z-10 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] supports-[backdrop-filter]:bg-[var(--surface)]/80">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-md)] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          aria-label="返回首页"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">返回首页</span>
        </Link>

        <div className="flex items-center gap-2">
          {reportId && (
            <Link
              href={`/reports/${reportId}/edit`}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-[var(--radius-md)] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline">编辑</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleShare}
            aria-label={copied ? '链接已复制' : '复制报告链接'}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-[var(--radius-md)] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {copied ? '已复制' : '分享'}
          </button>
        </div>
      </div>
    </nav>
  );
}
