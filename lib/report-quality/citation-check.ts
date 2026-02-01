/**
 * 报告质量管道 - 引用检查（可选）
 * 检查 keyMetrics、insights 中的数字是否能在 citationList 中找到对应表述
 * 支持万/亿等价匹配；可选严格模式（返回警告数供调用方决定是否重试）
 */

import type { AnalysisResult } from "@/lib/types";

/** 从文本中提取可能引用的数字/比例表述（如 "69.5%"、"3.88亿"、"增长 10%"） */
function extractNumericMentions(text: string): string[] {
  const mentions: string[] = [];
  const patterns = [/[\d,]+\.?\d*[亿万%％]/g, /[\d,]+\.?\d*/g];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) mentions.push(...m);
  }
  return [...new Set(mentions)].filter((s) => s.length >= 1);
}

/** 将「N万」「N亿」统一为「万」为单位的数值；非万/亿返回 null */
function toValueInWan(s: string): number | null {
  const t = s.replace(/,/g, "").trim();
  const wan = /^([\d.]+)万$/.exec(t);
  if (wan) return parseFloat(wan[1]);
  const yi = /^([\d.]+)亿$/.exec(t);
  if (yi) return parseFloat(yi[1]) * 10000;
  return null;
}

/** 从引用清单中构建「万」单位数值集合（万/亿等价）；允许 2% 误差视为同源 */
function buildValidValuesInWan(citationList: string[]): Set<number> {
  const set = new Set<number>();
  const listText = citationList.join(" ");
  const wanMatch = listText.matchAll(/[\d,]+\.?\d*万/g);
  for (const m of wanMatch) {
    const v = toValueInWan(m[0].replace(/,/g, ""));
    if (v != null && Number.isFinite(v)) set.add(v);
  }
  const yiMatch = listText.matchAll(/[\d,]+\.?\d*亿/g);
  for (const m of yiMatch) {
    const v = toValueInWan(m[0].replace(/,/g, ""));
    if (v != null && Number.isFinite(v)) set.add(v);
  }
  return set;
}

/** 数值是否在「万」单位集合中匹配（含 2% 容差） */
function matchesValueInWan(
  mentionValueInWan: number,
  validSet: Set<number>
): boolean {
  if (validSet.has(mentionValueInWan)) return true;
  for (const v of validSet) {
    const den = Math.max(Math.abs(v), Math.abs(mentionValueInWan), 1);
    if (Math.abs(v - mentionValueInWan) / den <= 0.02) return true;
  }
  return false;
}

export interface CitationCheckOptions {
  /** 严格模式：超过此警告数时，调用方可根据返回值考虑重试；默认 5 */
  strictThreshold?: number;
}

export interface CitationCheckResult {
  warnings: string[];
  /** 是否超过严格模式阈值（citationList 非空且 warnings.length > strictThreshold） */
  exceedsStrictThreshold: boolean;
}

/**
 * 检查报告内容中的数值是否在「仅可引用的统计清单」中有对应表述
 * 支持万/亿等价：如 3.88亿 与清单中的 38760万 视为同源（2% 容差）
 * @returns 警告列表与是否超过严格阈值
 */
export function checkCitations(
  analysis: AnalysisResult,
  citationList: string[],
  options: CitationCheckOptions = {}
): CitationCheckResult {
  const warnings: string[] = [];
  const listText = citationList.join(" ");
  const strictThreshold = options.strictThreshold ?? 5;
  const validValuesInWan =
    citationList.length > 0
      ? buildValidValuesInWan(citationList)
      : new Set<number>();

  const checkText = (source: string, text: string) => {
    const mentions = extractNumericMentions(text);
    for (const m of mentions) {
      if (listText.includes(m)) continue;
      const normalized = m.replace(/,/g, "");
      if (listText.includes(normalized)) continue;
      const valueInWan = toValueInWan(m);
      if (
        valueInWan != null &&
        Number.isFinite(valueInWan) &&
        validValuesInWan.size > 0
      ) {
        if (matchesValueInWan(valueInWan, validValuesInWan)) continue;
      }
      warnings.push(`[${source}] 数值「${m}」未在引用清单中找到对应表述`);
    }
  };

  for (const metric of analysis.keyMetrics) {
    if (metric.value) checkText("keyMetrics", String(metric.value));
  }
  analysis.insights.forEach((s, i) => checkText(`insights[${i}]`, s));

  const exceedsStrictThreshold =
    citationList.length > 0 && warnings.length > strictThreshold;

  return { warnings, exceedsStrictThreshold };
}

/**
 * 执行引用检查并仅打 log（不阻断流程）
 * 若启用严格模式且超过阈值，会额外 log 提示可考虑重试
 */
export function logCitationWarnings(
  analysis: AnalysisResult,
  citationList: string[],
  options: CitationCheckOptions = {}
): void {
  const { warnings, exceedsStrictThreshold } = checkCitations(
    analysis,
    citationList,
    options
  );
  if (warnings.length > 0) {
    console.warn("[report-quality] citation-check 警告:", warnings);
  }
  if (exceedsStrictThreshold) {
    console.warn(
      "[report-quality] citation-check 严格模式：警告数超过阈值，建议人工复检或重试生成"
    );
  }
}
