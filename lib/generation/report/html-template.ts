/**
 * 服务端根据 outline + analysis + selectedChartIds 生成报告正文 HTML
 * 图表部分只写占位符 data-chart-id，前端从 report.chartOptions 取 option 渲染
 */

import type { AnalysisResult, MetricItem, ReportOutline } from '@/lib/types';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function metricCardsHtml(metrics: MetricItem[]): string {
  if (metrics.length === 0) return '';
  const cards = metrics.slice(0, 6).map((m) => {
    const change =
      m.changePercent != null
        ? m.changePercent >= 0
          ? `<span class="report-metric-change report-metric-change--up">↑ ${m.changePercent}%</span>`
          : `<span class="report-metric-change report-metric-change--down">↓ ${Math.abs(m.changePercent)}%</span>`
        : '';
    return `<div class="report-metric-card"><span class="report-metric-label">${escapeHtml(m.label)}</span><span class="report-metric-value">${escapeHtml(m.value)}</span>${change}</div>`;
  });
  return `<div class="report-metric-cards">${cards.join('')}</div>`;
}

function listItemsHtml(items: string[]): string {
  if (items.length === 0) return '';
  return `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

/**
 * 根据大纲顺序 + analysis + selectedChartIds 生成报告正文 HTML
 * chart 章节按顺序用 selectedChartIds[i] 作为 data-chart-id；若 selectedChartIds 不足则用占位
 */
export function buildReportHtmlFromStructured(
  outline: ReportOutline,
  analysis: AnalysisResult,
  selectedChartIds: string[]
): string {
  const enabledSections = outline.sections.filter((s) => s.enabled);
  let chartIndex = 0;
  const parts: string[] = [];

  for (const section of enabledSections) {
    const title = escapeHtml(section.title);
    parts.push(`<section><h2>${title}</h2>`);

    switch (section.type) {
      case 'summary':
        parts.push(`<p>${escapeHtml(analysis.summary || '')}</p>`);
        break;
      case 'metrics':
        parts.push(metricCardsHtml(analysis.keyMetrics));
        break;
      case 'chart': {
        const chartId = selectedChartIds[chartIndex] ?? `chart_${chartIndex}`;
        chartIndex += 1;
        parts.push(`<div class="report-echarts-chart" data-chart-id="${escapeHtml(chartId)}"></div>`);
        break;
      }
      case 'insight':
        parts.push(listItemsHtml(analysis.insights));
        break;
      case 'recommendation':
        parts.push(listItemsHtml(analysis.recommendations));
        break;
      default:
        parts.push('');
    }

    parts.push('</section>');
  }

  return `<div class="report-content">${parts.join('')}</div>`;
}
