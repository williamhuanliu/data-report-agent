"use client";

import type { ReportOutline } from "@/lib/types";

interface GenerationProgressProps {
  progress: number;
  currentSection: string | null;
  outline: ReportOutline | null;
}

export function GenerationProgress({
  progress,
  currentSection,
  outline,
}: GenerationProgressProps) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      {/* Animated icon */}
      <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-linear-to-br from-gradient-start to-gradient-end flex items-center justify-center relative">
        <svg
          className="w-10 h-10 text-white animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        {/* Rotating ring */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-white/30 animate-spin" />
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">
        AI 正在生成报告...
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        {currentSection || "准备中..."}
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-linear-to-r from-gradient-start to-gradient-end transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm text-zinc-400">{Math.round(progress)}% 完成</p>

      {/* Section list */}
      {outline && (
        <div className="mt-8 text-left">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">
            报告结构
          </p>
          <div className="space-y-2">
            {outline.sections
              .filter((s) => s.enabled)
              .map((section, index) => {
                const sectionProgress =
                  (index / outline.sections.filter((s) => s.enabled).length) *
                  100;
                const isComplete = progress > sectionProgress;
                const isCurrent = currentSection === section.title;

                return (
                  <div
                    key={section.id}
                    className={`flex items-center gap-2 text-sm ${
                      isComplete
                        ? "text-success"
                        : isCurrent
                        ? "text-foreground"
                        : "text-zinc-400"
                    }`}
                  >
                    {isComplete ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
                    )}
                    <span>{section.title}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
