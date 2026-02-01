/**
 * 大纲生成 - 解析与后处理
 * 职责：从 LLM 原始文本提取 JSON、校验结构、同类型章节合并
 */

import {
  OUTLINE_MERGE_SYSTEM_PROMPT,
  buildOutlineMergePrompt,
} from '@/lib/ai/prompt';
import { getOpenRouterClient } from '@/lib/ai/openrouter';
import type { ReportOutline, OutlineSectionType } from '@/lib/types';

const SINGLE_OCCURRENCE_TYPES: OutlineSectionType[] = [
  'summary',
  'metrics',
  'insight',
  'recommendation',
];

export function hasDuplicateSectionTypes(outline: ReportOutline): boolean {
  const counts = new Map<OutlineSectionType, number>();
  for (const s of outline.sections) {
    const t = s.type as OutlineSectionType;
    if (!SINGLE_OCCURRENCE_TYPES.includes(t)) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.values()].some((c) => c > 1);
}

/**
 * 从 LLM 响应文本中解析大纲 JSON，校验 title + sections
 */
export function parseOutlineFromResponse(responseContent: string): ReportOutline {
  const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('无法从响应中提取大纲');
  }
  const outline = JSON.parse(jsonMatch[0]) as ReportOutline;
  if (!outline.title || !Array.isArray(outline.sections)) {
    throw new Error('大纲格式不正确');
  }
  return outline;
}

/**
 * 当大纲存在同类型重复章节时，调用 LLM 合并为每种类型至多一节
 */
export async function mergeDuplicateOutlineSections(
  outline: ReportOutline,
  model: string
): Promise<ReportOutline> {
  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: OUTLINE_MERGE_SYSTEM_PROMPT },
      { role: 'user', content: buildOutlineMergePrompt(JSON.stringify(outline, null, 2)) },
    ],
    temperature: 0.2,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) return outline;
  const mergeMatch = content.match(/\{[\s\S]*\}/);
  if (!mergeMatch) return outline;
  const merged = JSON.parse(mergeMatch[0]) as ReportOutline;
  if (merged.title && Array.isArray(merged.sections)) return merged;
  return outline;
}
