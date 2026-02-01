/**
 * 两阶段报告生成 - 内容计划（第一阶段）
 * 根据用户意图从分析摘要与图表候选中筛选出与意图直接相关的内容，供第二阶段严格按计划撰写
 */

import { getOpenRouterClient, getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { CONTENT_PLAN_SYSTEM_PROMPT, buildContentPlanPrompt } from '@/lib/ai/prompt';
import type { ReportOutline } from '@/lib/types';
import type { ChartCandidate } from '@/lib/types';
import type { IntentContentPlan } from './types';

function stripMarkdownCodeBlock(raw: string): string {
  const trimmed = raw.trim();
  const openMatch = trimmed.match(/^```(?:json)?\s*\n?/);
  if (!openMatch) return trimmed;
  const rest = trimmed.slice(openMatch[0].length);
  const lastClose = rest.lastIndexOf('```');
  if (lastClose === -1) return rest.trim();
  return rest.slice(0, lastClose).trim();
}

function extractFirstJsonObject(str: string): string | null {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  let quote = '';
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return str.slice(start, i + 1);
      } else if (c === '"' || c === "'") {
        inString = true;
        quote = c;
      }
      continue;
    }
    if (c === quote) inString = false;
  }
  return null;
}

function parseContentPlanJson(raw: string): IntentContentPlan | null {
  const stripped = stripMarkdownCodeBlock(raw);
  const jsonStr = extractFirstJsonObject(stripped) ?? stripped;
  try {
    const obj = JSON.parse(jsonStr) as unknown;
    if (!obj || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;
    const overallSummary = typeof o.overallSummary === 'string' ? o.overallSummary : '';
    const relevantMetrics = Array.isArray(o.relevantMetrics)
      ? (o.relevantMetrics as { label: string; value: string }[]).filter(
          (m) => typeof m?.label === 'string' && typeof m?.value === 'string'
        )
      : [];
    const relevantCharts = Array.isArray(o.relevantCharts)
      ? (o.relevantCharts as { id: string; title: string }[]).filter(
          (c) => typeof c?.id === 'string' && typeof c?.title === 'string'
        )
      : [];
    const relevantInsights = Array.isArray(o.relevantInsights)
      ? (o.relevantInsights as unknown[]).filter((i) => typeof i === 'string') as string[]
      : [];
    const relevantRecommendations = Array.isArray(o.relevantRecommendations)
      ? (o.relevantRecommendations as unknown[]).filter((r) => typeof r === 'string') as string[]
      : [];
    return {
      overallSummary,
      relevantMetrics,
      relevantCharts,
      relevantInsights,
      relevantRecommendations,
    };
  } catch {
    return null;
  }
}

/**
 * 将意图内容计划转为第二阶段 user prompt 可用的简洁文本
 */
export function formatContentPlanAsText(plan: IntentContentPlan): string {
  const lines: string[] = [];
  lines.push(`摘要：${plan.overallSummary}`);
  if (plan.relevantMetrics.length > 0) {
    lines.push('关键指标（仅使用以下）：');
    plan.relevantMetrics.forEach((m) => lines.push(`- ${m.label}：${m.value}`));
  }
  if (plan.relevantCharts.length > 0) {
    lines.push('图表（仅使用以下，id 用于数据来源）：');
    plan.relevantCharts.forEach((c) => lines.push(`- id=${c.id}，${c.title}`));
  }
  if (plan.relevantInsights.length > 0) {
    lines.push('洞察要点：');
    plan.relevantInsights.forEach((i) => lines.push(`- ${i}`));
  }
  if (plan.relevantRecommendations.length > 0) {
    lines.push('建议要点：');
    plan.relevantRecommendations.forEach((r) => lines.push(`- ${r}`));
  }
  return lines.join('\n');
}

/**
 * 调用 LLM 根据用户意图生成内容计划；解析失败时抛出，由调用方回退单阶段
 */
export async function generateContentPlan(
  idea: string,
  outline: ReportOutline,
  analysisSummary: string,
  citationList: string[],
  suggestedCharts: ChartCandidate[]
): Promise<IntentContentPlan> {
  const suggestedChartsJson = JSON.stringify(
    suggestedCharts.map((c) => ({ id: c.id, title: c.title, chartType: c.chartType, description: c.description })),
    null,
    2
  );
  const userPrompt = buildContentPlanPrompt(
    idea,
    JSON.stringify(outline, null, 2),
    analysisSummary,
    citationList,
    suggestedChartsJson
  );

  const model = getDefaultOpenRouterModel();
  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CONTENT_PLAN_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('内容计划 AI 返回为空');
  }

  const plan = parseContentPlanJson(content);
  if (!plan) {
    throw new Error('内容计划 JSON 解析失败');
  }
  return plan;
}
