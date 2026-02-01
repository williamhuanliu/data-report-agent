/**
 * 报告质量管道 - 简单质量分
 * 输入 AnalysisResult + 可选 citationList/dataAnalysis，输出 0–100 分及维度
 * 仅用于日志/调试或后续 A/B，不参与是否重试的自动决策
 */

import type { AnalysisResult, DataAnalysis } from "@/lib/types";
import { checkCitations } from "./citation-check";
import { checkCrossFileInsight } from "./cross-file-check";

export interface QualityScoreDimensions {
  /** 引用覆盖：有 citationList 时，1 - (警告数/总提及数)，否则 1 */
  citationCoverage: number;
  /** 洞察条数是否达标（3–6 条为满分） */
  insightCount: number;
  /** 建议条数是否达标（2–4 条为满分） */
  recommendationCount: number;
  /** 是否存在跨文件洞察（有跨文件统计时） */
  hasCrossFileInsight: boolean;
  /** 关键指标条数（1–6 条为合理） */
  keyMetricsCount: number;
}

export interface QualityScoreResult {
  score: number;
  dimensions: QualityScoreDimensions;
}

function clampScore(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}

/**
 * 计算报告质量分（0–100）及各维度
 * @param analysis 报告分析结果
 * @param citationList 仅可引用的统计清单（可选）
 * @param dataAnalysis 数据分析结果（可选，用于跨文件校验）
 */
export function computeQualityScore(
  analysis: AnalysisResult,
  citationList?: string[],
  dataAnalysis?: DataAnalysis | null
): QualityScoreResult {
  const dimensions: QualityScoreDimensions = {
    citationCoverage: 1,
    insightCount: 0,
    recommendationCount: 0,
    hasCrossFileInsight: true,
    keyMetricsCount: 0,
  };

  let totalScore = 0;
  const weights = {
    citation: 30,
    insight: 25,
    recommendation: 20,
    crossFile: 15,
    metrics: 10,
  };

  if (citationList && citationList.length > 0) {
    const { warnings } = checkCitations(analysis, citationList);
    const totalMentions =
      analysis.keyMetrics.filter((m) => m.value).length +
      analysis.insights.reduce(
        (acc, s) =>
          acc + (s.match(/[\d,]+\.?\d*[亿万%％]|[\d,]+\.?\d*/g)?.length ?? 0),
        0
      );
    dimensions.citationCoverage =
      totalMentions === 0
        ? 1
        : Math.max(0, 1 - warnings.length / Math.max(totalMentions, 1));
    totalScore += dimensions.citationCoverage * weights.citation;
  } else {
    totalScore += weights.citation;
  }

  const insightCount = analysis.insights.length;
  dimensions.insightCount =
    insightCount >= 3 && insightCount <= 6 ? 1 : insightCount >= 1 ? 0.6 : 0;
  totalScore += dimensions.insightCount * weights.insight;

  const recCount = analysis.recommendations.length;
  dimensions.recommendationCount =
    recCount >= 2 && recCount <= 4 ? 1 : recCount >= 1 ? 0.6 : 0;
  totalScore += dimensions.recommendationCount * weights.recommendation;

  if (dataAnalysis?.crossFileStats?.length) {
    const cross = checkCrossFileInsight(analysis, dataAnalysis);
    dimensions.hasCrossFileInsight = cross.hasCrossFileInsight;
    totalScore += (cross.hasCrossFileInsight ? 1 : 0) * weights.crossFile;
  } else {
    totalScore += weights.crossFile;
  }

  const metricsCount = analysis.keyMetrics.length;
  dimensions.keyMetricsCount =
    metricsCount >= 1 && metricsCount <= 6 ? 1 : metricsCount > 6 ? 0.8 : 0;
  totalScore += dimensions.keyMetricsCount * weights.metrics;

  return {
    score: clampScore(totalScore),
    dimensions,
  };
}

/**
 * 计算质量分并打 log（仅用于调试/可观测）
 */
export function logQualityScore(
  analysis: AnalysisResult,
  citationList?: string[],
  dataAnalysis?: DataAnalysis | null
): void {
  const result = computeQualityScore(analysis, citationList, dataAnalysis);
  console.info(
    "[report-quality] quality-score:",
    result.score,
    "dimensions:",
    result.dimensions
  );
}
