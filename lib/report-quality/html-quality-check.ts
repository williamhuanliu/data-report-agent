/**
 * 报告质量 - HTML 正文质量检查
 * 对 LLM 生成的报告 HTML 做无记录表述等检测，仅打 log / 写入 meta，不阻断流程
 */

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

/**
 * 对报告 HTML 做质量检查（无记录表述等），不阻断流程
 * @param html 报告正文 HTML
 * @param _citationList 预留：后续可做正文数字与引用清单的一致性检查
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
