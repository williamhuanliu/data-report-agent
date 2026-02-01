import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/storage";
import { getThemeById, getThemeCSSVariables } from "@/lib/themes";
import { ReportNav } from "@/app/components/report/ReportNav";
import { ReportHeader } from "@/app/components/report/ReportHeader";
import { ReportHtmlContent } from "@/app/components/report/ReportHtmlContent";
import { MetricGrid } from "@/app/components/report/MetricCard";
import {
  InsightSection,
  RecommendationSection,
} from "@/app/components/report/InsightSection";
import { ChartSection } from "@/app/components/report/ChartSection";
import type { Report, OutlineSectionType } from "@/lib/types";

interface ReportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ manage?: string }>;
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) {
    return { title: "报告不存在" };
  }
  const description = (report.analysis?.summary ?? report.contentHtml?.slice(0, 160) ?? '').slice(0, 160);
  return {
    title: `${report.title} | AI 数据报告`,
    description,
    openGraph: {
      title: report.title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: report.title,
      description,
    },
  };
}

export default async function ReportPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { id } = await params;
  const { manage } = await searchParams;
  const report = await getReport(id);

  if (!report) {
    notFound();
  }

  // 仅带 manage=1 时显示顶部栏（从工作台进入可编辑）；分享链接不带该参数，不显示顶部栏
  const showNav = manage === "1";

  // Apply theme if set
  const theme = report.theme ? getThemeById(report.theme) : null;
  const themeStyles = theme ? getThemeCSSVariables(theme) : {};

  return (
    <div
      className="min-h-screen bg-background"
      style={themeStyles as React.CSSProperties}
    >
      {showNav ? <ReportNav reportId={id} /> : null}

      {/* 报告内容 */}
      <main className="report-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-28 print:py-0 print:bg-white print:text-black">
        <ReportHeader report={report} />

        {showNav && report.meta?.qualityWarnings?.length ? (
          <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 rounded-lg px-4 py-2.5 print:hidden bg-surface-elevated border border-border">
            <span className="font-medium text-foreground">质量提示</span>
            <span className="mx-2">—</span>
            <span>建议人工复检</span>
            <ul className="mt-1.5 ml-4 list-disc space-y-0.5">
              {report.meta.qualityWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.contentHtml ? (
          <ReportHtmlContent report={report} contentHtml={report.contentHtml} />
        ) : report.outline?.sections ? (
          <ReportContentByOutline report={report} />
        ) : (
          <ReportContentDefault report={report} />
        )}
      </main>
    </div>
  );
}

function MetricsBlock({ report }: { report: Report }) {
  if (!report.analysis.keyMetrics.length) return null;
  return (
    <section className="mt-8" aria-labelledby="key-metrics-heading">
      <h2
        id="key-metrics-heading"
        className="text-xl font-semibold text-foreground mb-4"
      >
        关键指标
      </h2>
      <MetricGrid metrics={report.analysis.keyMetrics} />
    </section>
  );
}

function ChartsBlock({
  report,
  chartIndex = 0,
}: {
  report: Report;
  chartIndex?: number;
}) {
  if (report.analysis.charts && report.analysis.charts.length > 0) {
    const chart = report.analysis.charts[chartIndex];
    if (!chart) return null;
    return (
      <ChartSection
        data={chart.data}
        title={chart.title}
        chartType={chart.chartType}
      />
    );
  }
  if (
    report.analysis.chartData &&
    report.analysis.chartData.length > 0 &&
    chartIndex === 0
  ) {
    return (
      <ChartSection
        data={report.analysis.chartData}
        chartType={report.analysis.chartType}
      />
    );
  }
  return null;
}

function ReportContentByOutline({ report }: { report: Report }) {
  const enabled = report.outline!.sections.filter((s) => s.enabled);
  const firstSectionIsSummary = enabled[0]?.type === "summary";
  let chartIndex = 0;
  let metricsRendered = false;
  let insightRendered = false;
  let recommendationRendered = false;
  return (
    <>
      {enabled.map((section, index) => {
        const key = section.id;
        switch (section.type as OutlineSectionType) {
          case "metrics":
            if (metricsRendered) {
              return (
                <section
                  key={key}
                  className="mt-8"
                  aria-labelledby={`outline-${section.id}`}
                >
                  <h2
                    id={`outline-${section.id}`}
                    className="text-xl font-semibold text-foreground mb-2"
                  >
                    {section.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    见上方关键指标。
                  </p>
                </section>
              );
            }
            metricsRendered = true;
            return <MetricsBlock key={key} report={report} />;
          case "chart":
            return (
              <ChartsBlock
                key={key}
                report={report}
                chartIndex={chartIndex++}
              />
            );
          case "insight":
            if (insightRendered) {
              return (
                <section
                  key={key}
                  className="mt-8"
                  aria-labelledby={`outline-${section.id}`}
                >
                  <h2
                    id={`outline-${section.id}`}
                    className="text-xl font-semibold text-foreground mb-2"
                  >
                    {section.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    见上方核心洞察。
                  </p>
                </section>
              );
            }
            insightRendered = true;
            return (
              <InsightSection key={key} insights={report.analysis.insights} />
            );
          case "recommendation":
            if (recommendationRendered) {
              return (
                <section
                  key={key}
                  className="mt-8"
                  aria-labelledby={`outline-${section.id}`}
                >
                  <h2
                    id={`outline-${section.id}`}
                    className="text-xl font-semibold text-foreground mb-2"
                  >
                    {section.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    见上方行动建议。
                  </p>
                </section>
              );
            }
            recommendationRendered = true;
            return (
              <RecommendationSection
                key={key}
                recommendations={report.analysis.recommendations}
              />
            );
          case "summary":
            if (index === 0 && firstSectionIsSummary) {
              return (
                <section
                  key={key}
                  className="mt-8"
                  aria-labelledby={`outline-${section.id}`}
                >
                  <h2
                    id={`outline-${section.id}`}
                    className="text-xl font-semibold text-foreground mb-2"
                  >
                    {section.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">见上方摘要。</p>
                </section>
              );
            }
            return null;
          default:
            return null;
        }
      })}
    </>
  );
}

function ReportContentDefault({ report }: { report: Report }) {
  return (
    <>
      <MetricsBlock report={report} />
      <ChartsBlock report={report} />
      <InsightSection insights={report.analysis.insights} />
      <RecommendationSection
        recommendations={report.analysis.recommendations}
      />
    </>
  );
}
