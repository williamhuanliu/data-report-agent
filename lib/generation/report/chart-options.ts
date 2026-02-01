/**
 * 服务端根据 selectedChartIds 从 suggestedCharts 生成 ECharts option
 * 图表 100% 由服务端生成，前端只按 data-chart-id 取 option 渲染
 */

import type { ChartCandidate, ChartDataItem } from '@/lib/types';
import type { ReportChartOptions } from '@/lib/types';

function numericKeys(data: ChartDataItem[]): string[] {
  if (data.length === 0) return [];
  const first = data[0];
  return Object.keys(first).filter((k) => k !== 'name' && typeof first[k] === 'number');
}

/**
 * 从单个 ChartCandidate 生成 ECharts option（line 或 bar）
 */
export function buildEChartsOptionFromCandidate(candidate: ChartCandidate): Record<string, unknown> {
  const { chartType, data } = candidate;
  const names = data.map((d) => String(d.name));
  const keys = numericKeys(data);

  if (chartType === 'line') {
    const series = keys.map((name, i) => ({
      type: 'line',
      name,
      data: data.map((d) => (typeof d[name] === 'number' ? d[name] : 0)),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
    }));
    return {
      xAxis: { type: 'category', data: names, boundaryGap: true },
      yAxis: { type: 'value' },
      series,
    };
  }

  // bar: 竖向对比（category 在 x 轴）
  const series = keys.map((name) => ({
    type: 'bar',
    name,
    data: data.map((d) => (typeof d[name] === 'number' ? d[name] : 0)),
  }));
  return {
    xAxis: { type: 'category', data: names, boundaryGap: true },
    yAxis: { type: 'value' },
    series,
  };
}

/**
 * 根据 selectedChartIds 从 suggestedCharts 生成 report.chartOptions（按 id 索引）
 * 无效 id 跳过；若无有效 id 则返回空对象
 */
export function buildChartOptionsFromCandidates(
  suggestedCharts: ChartCandidate[],
  selectedChartIds: string[]
): ReportChartOptions {
  const idSet = new Set(suggestedCharts.map((c) => c.id));
  const result: ReportChartOptions = {};
  for (const id of selectedChartIds) {
    if (!idSet.has(id)) continue;
    const candidate = suggestedCharts.find((c) => c.id === id);
    if (!candidate || !candidate.data?.length) continue;
    result[id] = buildEChartsOptionFromCandidate(candidate);
  }
  return result;
}

/**
 * 校验并补全 selectedChartIds：无效的从候选中移除，若为空则取前 N 个图表章节对应的候选
 */
export function resolveSelectedChartIds(
  selectedChartIds: string[],
  suggestedCharts: ChartCandidate[],
  chartSectionCount: number
): string[] {
  const validIds = new Set(suggestedCharts.map((c) => c.id));
  const resolved = selectedChartIds.filter((id) => validIds.has(id));
  if (resolved.length >= chartSectionCount) return resolved;
  const need = chartSectionCount - resolved.length;
  for (const c of suggestedCharts) {
    if (resolved.includes(c.id)) continue;
    resolved.push(c.id);
    if (resolved.length >= chartSectionCount) break;
  }
  return resolved;
}
