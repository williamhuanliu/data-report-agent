/**
 * 报告生成模块 - 请求与流式事件类型
 */

import type { CreateMode, ParsedData, ReportOutline } from "@/lib/types";

/** 意图内容计划（两阶段生成：第一阶段 LLM 产出，第二阶段严格按此撰写） */
export interface IntentContentPlan {
  /** 报告如何回应用户意图的一句话概述 */
  overallSummary: string;
  /** 仅与意图相关的关键指标（可从 citationList 选或改写） */
  relevantMetrics: { label: string; value: string }[];
  /** 仅与意图相关的图表，id 必须来自 suggestedCharts[].id */
  relevantCharts: { id: string; title: string }[];
  /** 与意图直接相关的洞察要点 */
  relevantInsights: string[];
  /** 与意图直接相关的建议要点 */
  relevantRecommendations: string[];
}

export interface ReportRequest {
  mode: CreateMode;
  idea?: string;
  pastedContent?: string;
  data?: ParsedData;
  dataList?: ParsedData[];
  outline: ReportOutline;
  theme: string;
  title: string;
  model?: string;
  fileNames?: string[];
  /** import 模式下使用 DuckDB SQL 分析（LLM 出 SQL，服务端执行取数） */
  useSqlAnalysis?: boolean;
}

/** SSE 流事件：进度 / 完成 / 错误 */
export type ReportStreamEvent =
  | { type: "progress"; section: string; progress: number }
  | { type: "complete"; reportId: string }
  | { type: "error"; message: string };

export interface ReportGenerationOptions {
  onEvent?: (event: ReportStreamEvent) => void;
}
