/**
 * 报告质量管道 - 无记录表述检测（可选）
 * 检测 insights/recommendations 中是否出现「降至 0」「断崖式下跌」「下架」等表述，
 * 若存在则 log 警告（不自动替换，以免改坏语义）
 */

import type { AnalysisResult } from '@/lib/types';

/** 易与「无记录」混淆的错误表述（出现则建议改为「某月后无记录」等） */
const BAD_PHRASES = [
  '降至 0',
  '降至0',
  '降幅-100%',
  '降幅 -100%',
  '断崖式下跌',
  '需关注是否下架',
  '是否下架',
  '下架',
];

function extractPhrases(text: string): { phrase: string; index: number }[] {
  const found: { phrase: string; index: number }[] = [];
  const t = text.trim();
  for (const p of BAD_PHRASES) {
    const i = t.indexOf(p);
    if (i !== -1) found.push({ phrase: p, index: i });
  }
  return found;
}

export interface NoRecordCheckResult {
  warnings: string[];
}

/**
 * 检查报告中是否出现易与「无记录」混淆的表述
 * @returns 警告列表（来源 + 匹配到的表述）
 */
export function checkNoRecordWording(analysis: AnalysisResult): NoRecordCheckResult {
  const warnings: string[] = [];
  const sources = [
    { label: 'insights', items: analysis.insights },
    { label: 'recommendations', items: analysis.recommendations },
  ];
  for (const { label, items } of sources) {
    items.forEach((text, i) => {
      const found = extractPhrases(text);
      for (const { phrase } of found) {
        warnings.push(`[${label}[${i}]] 含「${phrase}」，建议改为「某月后无记录」等表述`);
      }
    });
  }
  return { warnings };
}

/**
 * 执行无记录表述检测并仅打 log（不阻断流程）
 */
export function logNoRecordWarnings(analysis: AnalysisResult): void {
  const { warnings } = checkNoRecordWording(analysis);
  if (warnings.length > 0) {
    console.warn('[report-quality] no-record-check 警告:', warnings);
  }
}
