import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReport } from '@/lib/storage';
import { getThemeById, getThemeCSSVariables } from '@/lib/themes';
import { ReportNav } from '@/app/components/report/ReportNav';
import { ReportHeader } from '@/app/components/report/ReportHeader';
import { MetricGrid } from '@/app/components/report/MetricCard';
import { InsightSection, RecommendationSection } from '@/app/components/report/InsightSection';
import { ChartSection } from '@/app/components/report/ChartSection';

interface ReportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ manage?: string }>;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) {
    return { title: '报告不存在' };
  }
  const description = report.analysis.summary.slice(0, 160);
  return {
    title: `${report.title} | AI 数据报告`,
    description,
    openGraph: {
      title: report.title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: report.title,
      description,
    },
  };
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { id } = await params;
  const { manage } = await searchParams;
  const report = await getReport(id);

  if (!report) {
    notFound();
  }

  // 仅带 manage=1 时显示顶部栏（从工作台进入可编辑）；分享链接不带该参数，不显示顶部栏
  const showNav = manage === '1';

  // Apply theme if set
  const theme = report.theme ? getThemeById(report.theme) : null;
  const themeStyles = theme ? getThemeCSSVariables(theme) : {};

  return (
    <div className="min-h-screen bg-background" style={themeStyles as React.CSSProperties}>
      {showNav ? <ReportNav reportId={id} /> : null}

      {/* 报告内容 - 打印时隐藏导航，保证背景白 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-20 print:py-0 print:bg-white print:text-black">
        <ReportHeader report={report} />
        
        {/* 关键指标 */}
        {report.analysis.keyMetrics.length > 0 && (
          <section className="mt-8" aria-labelledby="key-metrics-heading">
            <h2 id="key-metrics-heading" className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
              关键指标
            </h2>
            <MetricGrid metrics={report.analysis.keyMetrics} />
          </section>
        )}

        {/* 图表 */}
        {report.analysis.chartData && report.analysis.chartData.length > 0 && (
          <ChartSection data={report.analysis.chartData} />
        )}

        {/* 核心洞察 */}
        <InsightSection insights={report.analysis.insights} />

        {/* 行动建议 */}
        <RecommendationSection recommendations={report.analysis.recommendations} />
      </main>
    </div>
  );
}
