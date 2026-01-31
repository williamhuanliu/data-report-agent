'use client';

import type { Report } from '@/lib/types';

interface ReportHeaderProps {
  report: Report;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const createdDate = new Date(report.createdAt);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <header className="mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
          {report.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {formatDate(createdDate)}
        </p>
      </div>
      <div className="mt-6 p-4 sm:p-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-primary)]/5">
        <p className="text-base sm:text-lg text-[var(--foreground)] font-medium leading-relaxed">
          {report.analysis.summary}
        </p>
      </div>
    </header>
  );
}
