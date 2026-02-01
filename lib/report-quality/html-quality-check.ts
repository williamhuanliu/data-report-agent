/**
 * 报告质量 - HTML 正文质量检查
 * 对 LLM 生成的报告 HTML 做无记录表述等检测；对 analysis 做正文数字与 citationList 的一致性检查
 */

import type { AnalysisResult } from "@/lib/types";
import { checkCitations } from "./citation-check";

/** 易与「无记录」混淆的错误表述（与 no-record-check 一致） */
const BAD_PHRASES = [
  "降至 0",
  "降至0",
  "降幅-100%",
  "降幅 -100%",
  "断崖式下跌",
  "需关注是否下架",
  "是否下架",
  "下架",
];

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface HtmlQualityResult {
  /** 无记录相关表述警告 */
  noRecordWarnings: string[];
  /** 是否建议人工复检（例如存在多条违规表述） */
  suggestReview: boolean;
}

/**
 * 检查 HTML 报告中是否出现易与「无记录」混淆的表述
 */
export function checkNoRecordWordingInHtml(html: string): string[] {
  const text = stripHtmlToText(html);
  const warnings: string[] = [];
  for (const phrase of BAD_PHRASES) {
    if (text.includes(phrase)) {
      warnings.push(`正文中出现「${phrase}」，建议改为「某月后无记录」等表述`);
    }
  }
  return warnings;
}

export interface AnalysisQualityResult {
  /** 正文/analysis 中数值与 citationList 不一致的警告 */
  citationWarnings: string[];
  /** 无记录相关表述警告（来自 analysis.insights / recommendations） */
  noRecordWarnings: string[];
  /** 是否建议人工复检 */
  suggestReview: boolean;
}

/**
 * 对 Report.analysis 做质量检查：引用一致性（数值须来自 citationList）+ 无记录表述
 * 供 import 模式结构化报告写入 meta.qualityWarnings
 */
export function checkAnalysisQuality(
  analysis: AnalysisResult,
  citationList: string[]
): AnalysisQualityResult {
  const citationWarnings = checkCitations(analysis, citationList).warnings;
  const noRecordWarnings: string[] = [];
  const sources = [
    { label: "insights", items: analysis.insights },
    { label: "recommendations", items: analysis.recommendations },
  ];
  for (const { label, items } of sources) {
    items.forEach((text, i) => {
      for (const phrase of BAD_PHRASES) {
        if (text.includes(phrase)) {
          noRecordWarnings.push(
            `[${label}[${i}]] 含「${phrase}」，建议改为「某月后无记录」等表述`
          );
        }
      }
    });
  }
  const suggestReview =
    citationWarnings.length >= 3 || noRecordWarnings.length >= 2;
  return {
    citationWarnings,
    noRecordWarnings,
    suggestReview,
  };
}

/**
 * 对报告 HTML 做质量检查（无记录表述等），不阻断流程
 * @param html 报告正文 HTML
 * @param _citationList 预留：正文数字与引用清单一致性可对 analysis 用 checkAnalysisQuality
 */
export function checkHtmlQuality(
  html: string,
  _citationList?: string[]
): HtmlQualityResult {
  const noRecordWarnings = checkNoRecordWordingInHtml(html);
  const suggestReview = noRecordWarnings.length >= 2;

  return {
    noRecordWarnings,
    suggestReview,
  };
}

/**
 * 执行 HTML 质量检查并打 log（不阻断流程）
 */
export function logHtmlQualityWarnings(
  html: string,
  citationList?: string[]
): HtmlQualityResult {
  const result = checkHtmlQuality(html, citationList);
  if (result.noRecordWarnings.length > 0) {
    console.warn("[report-quality] html no-record 警告:", result.noRecordWarnings);
  }
  if (result.suggestReview) {
    console.warn("[report-quality] 建议人工复检报告正文");
  }
  return result;
}
