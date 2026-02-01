/**
 * 报告质量管道 - 跨文件洞察事后校验
 * 当存在跨文件统计时，检查 insights 是否至少有一条与跨文件/按维度统计相关
 */

import type { AnalysisResult, DataAnalysis } from '@/lib/types';

/** 与跨文件洞察相关的关键词（任一出现即视为覆盖） */
const CROSS_FILE_KEYWORDS = [
  '跨文件',
  '跨数据',
  '按厂牌',
  '按歌手',
  '按艺人',
  '厂牌',
  '歌手',
  '艺人',
  '关联',
  '多文件',
  '多数据源',
];

function hasCrossFileKeyword(text: string): boolean {
  const t = text.trim();
  return CROSS_FILE_KEYWORDS.some((k) => t.includes(k));
}

export interface CrossFileCheckResult {
  /** 是否存在跨文件类洞察（或无跨文件统计时视为通过） */
  hasCrossFileInsight: boolean;
  /** 未通过时的建议说明 */
  warning?: string;
}

/**
 * 当 dataAnalysis.crossFileStats 非空时，校验 insights 中是否至少有一条与跨文件/按维度统计相关
 * @returns 是否通过及可选警告信息
 */
export function checkCrossFileInsight(
  analysis: AnalysisResult,
  dataAnalysis: DataAnalysis | null
): CrossFileCheckResult {
  if (!dataAnalysis?.crossFileStats?.length) {
    return { hasCrossFileInsight: true };
  }
  const hasMatch = analysis.insights.some((s) => hasCrossFileKeyword(s));
  if (hasMatch) return { hasCrossFileInsight: true };
  return {
    hasCrossFileInsight: false,
    warning:
      '存在跨文件统计但报告中未发现跨文件/按维度类洞察，建议至少补充一条（如按厂牌/歌手统计的排名或集中度）',
  };
}

/**
 * 执行跨文件洞察校验并仅打 log（不阻断流程）
 */
export function logCrossFileWarning(
  analysis: AnalysisResult,
  dataAnalysis: DataAnalysis | null
): void {
  const result = checkCrossFileInsight(analysis, dataAnalysis);
  if (!result.hasCrossFileInsight && result.warning) {
    console.warn('[report-quality] cross-file-check:', result.warning);
  }
}
