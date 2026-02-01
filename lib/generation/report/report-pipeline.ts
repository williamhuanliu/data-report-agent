/**
 * 报告生成 - 后处理管道（HTML 由大模型生成，图表在 html 内用 data-chart-type + data-chart-data，前端用 Recharts 渲染）
 * 解析 AI 返回的 { summary, html } → 产出 contentHtml + analysis（仅 summary）
 */

import type { AnalysisResult, ReportOutline } from '@/lib/types';

export interface RunPipelineInput {
  responseContent: string;
  mode: 'generate' | 'paste' | 'import';
  outline: ReportOutline;
}

export type RunPipelineResult =
  | { success: true; contentHtml: string; analysis: AnalysisResult }
  | { success: false; error: string };

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

/** 从可能被截断的 JSON 中尝试恢复 summary 与 html（仅当正常解析失败时使用） */
function recoverTruncatedPayload(stripped: string): { summary: string; html: string } | null {
  const summaryMatch = stripped.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const summary = summaryMatch ? summaryMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : '';
  const htmlStart = stripped.indexOf('"html"');
  if (htmlStart === -1) return null;
  const valueStart = stripped.indexOf('"', htmlStart + 6) + 1;
  if (valueStart === 0) return null;
  let html = '';
  let i = valueStart;
  while (i < stripped.length) {
    const c = stripped[i];
    if (c === '\\') {
      i += 1;
      if (i < stripped.length) {
        html += stripped[i] === '"' ? '"' : stripped[i];
        i += 1;
      }
      continue;
    }
    if (c === '"') break;
    html += c;
    i += 1;
  }
  html = html.trim();
  if (html.length < 10) return null;
  if (!html.endsWith('</div>') && !html.endsWith('>')) {
    const lastClose = Math.max(html.lastIndexOf('</section>'), html.lastIndexOf('</div>'), html.lastIndexOf('</p>'));
    if (lastClose > 0) html = html.slice(0, lastClose);
    const needClose = (html.match(/<div/g)?.length ?? 0) - (html.match(/<\/div>/g)?.length ?? 0);
    for (let j = 0; j < needClose; j++) html += '</div>';
  }
  return { summary, html };
}

function parseHtmlReportPayload(raw: string): { summary: string; html: string } | null {
  const stripped = stripMarkdownCodeBlock(raw);
  let jsonStr = extractFirstJsonObject(stripped);
  if (!jsonStr) {
    const fallback = stripped.match(/\{[\s\S]*\}/);
    jsonStr = fallback ? fallback[0] : null;
  }
  if (jsonStr) {
    try {
      const obj = JSON.parse(jsonStr) as Record<string, unknown>;
      const summary = typeof obj.summary === 'string' ? obj.summary : '';
      const html = typeof obj.html === 'string' ? obj.html : '';
      if (html && html.trim().length > 0) return { summary, html };
    } catch {
      // 解析失败，可能被截断，尝试恢复
    }
  }
  const recovered = recoverTruncatedPayload(stripped);
  if (recovered) {
    console.warn('[report-pipeline] 响应可能被截断，已从截断内容中恢复 summary 与部分 html');
    return recovered;
  }
  return null;
}

export async function runReportPipeline(input: RunPipelineInput): Promise<RunPipelineResult> {
  const { responseContent } = input;

  const payload = parseHtmlReportPayload(responseContent);
  if (!payload) {
    const snippet = responseContent.trim().slice(0, 300);
    console.warn('[report-pipeline] 无法解析报告 JSON，响应片段:', snippet);
    return { success: false, error: '无法从响应中提取报告 JSON（需含 summary 与 html）' };
  }

  const analysis: AnalysisResult = {
    summary: payload.summary || '报告已生成',
    keyMetrics: [],
    insights: [],
    recommendations: [],
  };

  return { success: true, contentHtml: payload.html, analysis };
}
