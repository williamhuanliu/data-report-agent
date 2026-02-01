/**
 * 报告质量管道 - Schema 校验
 * 用 Zod 定义 AnalysisResult，解析 AI 响应时做结构化校验
 */

import { z } from 'zod';

const trendEnum = z.enum(['up', 'down', 'stable']);

export const metricItemSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]).transform(String),
  trend: trendEnum.default('stable'),
  changePercent: z.number().optional(),
});

export const chartDataItemSchema = z.object({
  name: z.string(),
}).catchall(z.union([z.string(), z.number()]));

export const reportChartSchema = z.object({
  title: z.string(),
  data: z.array(chartDataItemSchema),
  chartType: z.enum(['line', 'bar']),
});

/** AI 返回的原始结构（含 selectedChartId/selectedChartIds） */
export const analysisResultSchema = z.object({
  summary: z.string().default(''),
  keyMetrics: z.array(metricItemSchema).default([]),
  insights: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  chartData: z.array(chartDataItemSchema).optional(),
  chartType: z.enum(['line', 'bar']).optional(),
  charts: z.array(reportChartSchema).optional(),
  selectedChartId: z.string().optional(),
  selectedChartIds: z.array(z.string()).optional(),
}).transform((data) => ({
  summary: data.summary || '报告已生成',
  keyMetrics: data.keyMetrics,
  insights: data.insights,
  recommendations: data.recommendations,
  chartData: data.chartData,
  chartType: data.chartType,
  charts: data.charts,
  selectedChartId: data.selectedChartId,
  selectedChartIds: data.selectedChartIds,
}));

export type ParsedAnalysisPayload = z.infer<typeof analysisResultSchema>;

/**
 * 从 AI 响应文本中解析并校验为 AnalysisResult 兼容结构
 * @param raw - 原始 JSON 字符串或已解析对象
 * @returns 校验后的对象，或 null 表示解析/校验失败
 */
export function parseAndValidateAnalysisResult(
  raw: string | unknown
): { success: true; data: ParsedAnalysisPayload } | { success: false; error: string } {
  let obj: unknown;
  if (typeof raw === 'string') {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: '无法从响应中提取 JSON' };
      }
      obj = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return { success: false, error: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}` };
    }
  } else {
    obj = raw;
  }

  const result = analysisResultSchema.safeParse(obj);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const first = result.error.errors[0];
  const path = first?.path?.join('.') || 'root';
  return {
    success: false,
    error: `校验失败 [${path}]: ${first?.message ?? result.error.message}`,
  };
}
