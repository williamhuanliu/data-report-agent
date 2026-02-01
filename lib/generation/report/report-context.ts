/**
 * 报告生成 - 按模式构建 Prompt 与 import 阶段数据
 * 职责：根据 mode 与 payload 产出 systemPrompt、userPrompt，import 时产出数据分析结果与图表候选
 */

import {
  REPORT_HTML_GENERATE_SYSTEM_PROMPT,
  buildReportHtmlGeneratePrompt,
  REPORT_HTML_IMPORT_SYSTEM_PROMPT,
  buildReportHtmlImportPrompt,
} from '@/lib/ai/prompt';
import { getAnalysisInput } from '@/lib/data-analyzer';
import type { CreateMode, ParsedData, ReportOutline, DataAnalysis, ChartCandidate } from '@/lib/types';

export interface ReportContextResult {
  systemPrompt: string;
  userPrompt: string;
  /** import 模式下的扩展数据（rawData、citationList、analysisSummary、suggestedCharts 供两阶段生成用） */
  importPayload?: {
    rawData: Record<string, unknown>[];
    dataAnalysis: DataAnalysis;
    citationList: string[];
    analysisSummary: string;
    suggestedCharts: ChartCandidate[];
  };
}

function extractFileNames(dataList: ParsedData[]): string[] {
  return dataList.map((_, i) => `文件${i + 1}`);
}

export interface BuildReportContextInput {
  mode: CreateMode;
  idea?: string;
  pastedContent?: string;
  data?: ParsedData;
  dataList?: ParsedData[];
  outline: ReportOutline;
  title: string;
  fileNames?: string[];
}

/**
 * 构建报告生成的 LLM 上下文；import 模式同时返回数据分析结果与图表候选信息
 */
export function buildReportContext(input: BuildReportContextInput): ReportContextResult {
  const { mode, idea, pastedContent, data, dataList, outline, title, fileNames } = input;

  if (mode === 'generate') {
    const content = (idea ?? '').trim();
    return {
      systemPrompt: REPORT_HTML_GENERATE_SYSTEM_PROMPT,
      userPrompt: buildReportHtmlGeneratePrompt(mode, content, JSON.stringify(outline, null, 2)),
    };
  }

  if (mode === 'paste') {
    const content = (pastedContent ?? '').trim();
    return {
      systemPrompt: REPORT_HTML_GENERATE_SYSTEM_PROMPT,
      userPrompt: buildReportHtmlGeneratePrompt(mode, content, JSON.stringify(outline, null, 2)),
    };
  }

  if (mode === 'import') {
    const list = dataList?.length ? dataList : data ? [data] : [];
    const rawData: Record<string, unknown>[] = [];
    for (const item of list) rawData.push(...item.rows);
    const names = fileNames ?? extractFileNames(list);
    const inputResult = getAnalysisInput(list, names);
    const { dataAnalysis, citationList, analysisSummary, suggestedCharts } = inputResult;
    const userPrompt = buildReportHtmlImportPrompt(
      JSON.stringify(outline, null, 2),
      analysisSummary,
      citationList,
      idea?.trim()
    );
    return {
      systemPrompt: REPORT_HTML_IMPORT_SYSTEM_PROMPT,
      userPrompt,
      importPayload: { rawData, dataAnalysis, citationList, analysisSummary, suggestedCharts },
    };
  }

  throw new Error('无效的创建模式');
}
