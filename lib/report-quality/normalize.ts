/**
 * 报告质量管道 - 数值与单位归一化
 * 纠正模型易错项：万/亿单位、总播放量等
 */

import type { AnalysisResult, DataAnalysis, MetricItem } from '@/lib/types';
import type { ParsedAnalysisPayload } from './schema';

/** 纠正「X.XX万万」→「X.XX亿」（如 1.11万万 实为 1.11亿） */
function fixWanWanInString(s: string): string {
  return s.replace(/([\d.]+)万万/g, (_, p1) => {
    const num = parseFloat(p1);
    return num >= 0.1 && num < 1000 ? `${p1}亿` : `${p1}万`;
  });
}

/**
 * 从 DataAnalysis 中取「播放量万」等字段的总和，用于纠正 keyMetrics 中总播放量单位
 */
function getPlaySumFromAnalysis(dataAnalysis: DataAnalysis): number | null {
  for (const file of dataAnalysis.files) {
    const stats = file.numericStats?.['播放量万'];
    if (stats != null) return stats.sum;
  }
  return null;
}

/**
 * 纠正 keyMetrics 中「总播放量」「播放量合计」的 value（模型常误写为 3.88万、3.88万万）
 */
function normalizeKeyMetricsPlayback(
  keyMetrics: MetricItem[],
  playSum: number | null
): void {
  if (playSum == null || playSum < 1000) return;
  const correctValue =
    playSum >= 10000 ? `${(playSum / 10000).toFixed(2)}亿` : `${playSum}万`;
  for (const m of keyMetrics) {
    if (
      (m.label?.includes('总播放量') || m.label?.includes('播放量合计')) &&
      typeof m.value === 'string'
    ) {
      const v = m.value.replace(/,/g, '');
      if (/^[\d.]+万万?$/.test(v) || v === '3.88万' || v === '3.88万万') {
        m.value = correctValue;
      }
    }
  }
}

/** 去重字符串数组（保留首次出现顺序，忽略首尾空白；内容完全一致视为重复） */
function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = (s ?? '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 将解析后的 AI 结果归一化为标准 AnalysisResult
 * - 统一万/亿表述（summary、insights）
 * - 在提供 dataAnalysis 时纠正总播放量等 keyMetrics
 * - 对 insights、recommendations 去重，避免模型输出两条相同内容
 */
export function normalizeAnalysisResult(
  parsed: ParsedAnalysisPayload,
  dataAnalysis?: DataAnalysis | null
): AnalysisResult {
  const summary = fixWanWanInString(parsed.summary);
  const insights = dedupeStrings(parsed.insights.map(fixWanWanInString));
  const keyMetrics = parsed.keyMetrics.map((m) => ({
    ...m,
    value: String(m.value),
  }));

  if (dataAnalysis) {
    const playSum = getPlaySumFromAnalysis(dataAnalysis);
    normalizeKeyMetricsPlayback(keyMetrics, playSum);
  }

  const result: AnalysisResult = {
    summary,
    keyMetrics,
    insights,
    recommendations: dedupeStrings(parsed.recommendations),
  };

  if (parsed.chartData?.length) result.chartData = parsed.chartData;
  if (parsed.chartType) result.chartType = parsed.chartType;
  if (parsed.charts?.length) result.charts = parsed.charts;

  return result;
}
