"use client";

import type { Report } from "@/lib/types";

interface ReportHeaderProps {
  report: Report;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const createdDate = new Date(report.createdAt);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  // 有 contentHtml 时正文首段即为执行摘要，不再在头部重复展示
  const showSummaryBox = !report.contentHtml;

  return (
    <header className="report-header mb-6 pb-5">
      <p
        className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 font-medium mb-3"
        aria-hidden
      >
        {formatDate(createdDate)}
      </p>
      <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold text-foreground tracking-tight leading-[1.2]">
        {report.title}
      </h1>
      {showSummaryBox && (report.analysis?.summary ?? '').trim() ? (
        <p className="mt-6 text-base text-foreground/88 leading-relaxed max-w-[65ch]">
          {report.analysis?.summary}
        </p>
      ) : null}
    </header>
  );
}
