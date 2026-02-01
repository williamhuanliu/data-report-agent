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
        className="text-xl font-semibold text-foreground mb-4"
      >
        核心洞察
      </h2>
      <ul className="space-y-3 list-none pl-0">
        {insights.map((insight, index) => (
          <li
            key={index}
            className="flex gap-3 gap-x-4 p-4 bg-surface rounded-lg border border-border"
          >
            <span
              className="shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium"
              aria-hidden
            >
              {index + 1}
            </span>
            <p className="text-foreground leading-relaxed min-w-0">
              {insight}
            </p>
          </li>
        ))}
      </ul>
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
        className="text-xl font-semibold text-foreground mb-4"
      >
        行动建议
      </h2>
      <ul className="space-y-3 list-none pl-0">
        {recommendations.map((rec, index) => (
          <li
            key={index}
            className="flex gap-3 gap-x-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30"
          >
            <svg
              className="shrink-0 w-5 h-5 text-green-600 dark:text-green-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <p className="text-foreground leading-relaxed min-w-0">
              {rec}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
