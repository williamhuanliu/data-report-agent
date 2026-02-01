"use client";

import type { MetricItem } from "@/lib/types";

interface MetricCardProps {
  metric: MetricItem;
}

export function MetricCard({ metric }: MetricCardProps) {
  const getTrendIcon = () => {
    switch (metric.trend) {
      case "up":
        return (
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
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        );
      case "down":
        return (
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
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        );
      default:
        return (
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
              d="M5 12h14"
            />
          </svg>
        );
    }
  };

  const getTrendColor = () => {
    switch (metric.trend) {
      case "up":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      case "down":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      default:
        return "text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800";
    }
  };

  return (
    <div className="p-5 bg-surface rounded-lg border border-border hover:shadow-sm transition-shadow duration-normal">
      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
        {metric.label}
      </div>

      <div className="flex items-end justify-between">
        <div className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums">
          {metric.value}
        </div>

        {metric.changePercent !== undefined && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getTrendColor()}`}
          >
            {getTrendIcon()}
            <span>{Math.abs(metric.changePercent)}%</span>
          </div>
        )}

        {metric.changePercent === undefined && metric.trend !== "stable" && (
          <div
            className={`flex items-center px-2 py-1 rounded-full ${getTrendColor()}`}
          >
            {getTrendIcon()}
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricGridProps {
  metrics: MetricItem[];
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} metric={metric} />
      ))}
    </div>
  );
}
