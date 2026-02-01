"use client";

interface InsightSectionProps {
  insights: string[];
}

export function InsightSection({ insights }: InsightSectionProps) {
  if (insights.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="insights-heading">
      <h2
        id="insights-heading"
        className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"
      >
        <span className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </span>
        核心洞察
      </h2>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-4 bg-surface rounded-lg border border-border flex gap-3"
          >
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium"
              aria-hidden
            >
              {index + 1}
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {insight}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface RecommendationSectionProps {
  recommendations: string[];
}

export function RecommendationSection({
  recommendations,
}: RecommendationSectionProps) {
  if (recommendations.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="recommendations-heading">
      <h2
        id="recommendations-heading"
        className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2"
      >
        <span className="w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        行动建议
      </h2>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30 flex gap-3"
          >
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {rec}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
