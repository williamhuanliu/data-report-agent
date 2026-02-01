/**
 * SQL 分析路径：解析 LLM 返回的 SQL JSON，在 DuckDB 上执行并组装 AnalysisResult + chartOptions
 */

import type { ParsedData } from "@/lib/types";
import type { AnalysisResult, ChartDataItem, MetricItem, ReportChartOptions } from "@/lib/types";
import type { ReportOutline } from "@/lib/types";
import {
  openDb,
  closeDb,
  loadParsedData,
  executeReadOnlyQuery,
  type DuckDBConnection,
} from "@/lib/duckdb";
import { buildEChartsOptionFromData } from "./chart-options";

/** LLM 输出的 keyMetrics 项（含 sql，执行后填 value） */
export interface SqlMetricItem {
  label: string;
  sql: string;
}

/** LLM 输出的 chartQueries 项 */
export interface SqlChartQuery {
  id: string;
  title: string;
  chartType: "bar" | "line";
  sql: string;
}

export interface SqlReportPayload {
  summary: string;
  keyMetrics: SqlMetricItem[];
  insights: string[];
  recommendations: string[];
  chartQueries: SqlChartQuery[];
}

function stripMarkdownCodeBlock(raw: string): string {
  const trimmed = raw.trim();
  const openMatch = trimmed.match(/^```(?:json)?\s*\n?/);
  if (!openMatch) return trimmed;
  const rest = trimmed.slice(openMatch[0].length);
  const lastClose = rest.lastIndexOf("```");
  if (lastClose === -1) return rest.trim();
  return rest.slice(0, lastClose).trim();
}

function extractFirstJsonObject(str: string): string | null {
  const start = str.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  let quote = "";
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (!inString) {
      if (c === "{") depth++;
      else if (c === "}") {
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

/**
 * 从 LLM 响应中解析 SQL 报告 JSON
 */
export function parseSqlPayload(raw: string): SqlReportPayload | null {
  const stripped = stripMarkdownCodeBlock(raw);
  const jsonStr = extractFirstJsonObject(stripped) ?? stripped.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) return null;
  try {
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    const summary = typeof obj.summary === "string" ? obj.summary : "";
    const keyMetrics: SqlMetricItem[] = [];
    if (Array.isArray(obj.keyMetrics)) {
      for (const m of obj.keyMetrics as unknown[]) {
        if (m && typeof m === "object" && "label" in m && "sql" in m) {
          const mm = m as Record<string, unknown>;
          if (typeof mm.label === "string" && typeof mm.sql === "string") {
            keyMetrics.push({ label: mm.label, sql: mm.sql });
          }
        }
      }
    }
    const insights = Array.isArray(obj.insights)
      ? (obj.insights as unknown[]).filter((i): i is string => typeof i === "string")
      : [];
    const recommendations = Array.isArray(obj.recommendations)
      ? (obj.recommendations as unknown[]).filter((r): r is string => typeof r === "string")
      : [];
    const chartQueries: SqlChartQuery[] = [];
    if (Array.isArray(obj.chartQueries)) {
      for (const c of obj.chartQueries as unknown[]) {
        if (
          c &&
          typeof c === "object" &&
          "id" in c &&
          "title" in c &&
          "chartType" in c &&
          "sql" in c
        ) {
          const cc = c as Record<string, unknown>;
          if (
            typeof cc.id === "string" &&
            typeof cc.title === "string" &&
            (cc.chartType === "bar" || cc.chartType === "line") &&
            typeof cc.sql === "string"
          ) {
            chartQueries.push({
              id: cc.id,
              title: cc.title,
              chartType: cc.chartType,
              sql: cc.sql,
            });
          }
        }
      }
    }
    return { summary, keyMetrics, insights, recommendations, chartQueries };
  } catch {
    return null;
  }
}

/**
 * 为 LLM 生成表结构描述（表名、列名、类型、行数）
 */
export function buildSchemaText(
  dataList: ParsedData[],
  tableNames: string[]
): string {
  const lines: string[] = [];
  for (let i = 0; i < dataList.length; i++) {
    const data = dataList[i];
    const tableName = tableNames[i] ?? `t${i + 1}`;
    const cols = data.headers.map((h) => {
      const t = data.columnTypes?.[h] ?? "string";
      const typeStr = t === "number" ? "DOUBLE" : t === "date" ? "DATE" : "VARCHAR";
      const quoted = h.includes(" ") || /[^a-zA-Z0-9_]/.test(h) ? `"${h}"` : h;
      return `${quoted} ${typeStr}`;
    });
    lines.push(
      `- ${tableName} (${cols.join(", ")})，约 ${data.rows.length} 行`
    );
  }
  return lines.join("\n");
}

/**
 * 执行 keyMetrics 中的 SQL，取第一行第一列（或 value 列）作为展示值，组装 AnalysisResult
 */
export async function runSqlAndBuildAnalysis(
  conn: DuckDBConnection,
  payload: SqlReportPayload
): Promise<AnalysisResult> {
  const keyMetrics: MetricItem[] = [];
  for (const m of payload.keyMetrics.slice(0, 6)) {
    let value = "";
    try {
      const rows = await executeReadOnlyQuery(conn, m.sql);
      if (rows.length > 0) {
        const first = rows[0];
        if (first && typeof first === "object") {
          if ("value" in first && first.value != null) {
            value = String(first.value);
          } else {
            const keys = Object.keys(first);
            const firstCol = keys[0];
            if (firstCol && first[firstCol] != null) {
              value = String(first[firstCol]);
            }
          }
        }
      }
    } catch (e) {
      value = `(查询异常: ${e instanceof Error ? e.message : "未知"})`;
    }
    keyMetrics.push({ label: m.label, value: value || "—", trend: "stable" });
  }
  return {
    summary: payload.summary || "报告已生成",
    keyMetrics,
    insights: payload.insights.slice(0, 5),
    recommendations: payload.recommendations.slice(0, 4),
  };
}

/**
 * 将 SQL 结果行转为 ChartDataItem[]（需含 name 列及数值列）
 */
function rowsToChartData(rows: Record<string, unknown>[]): ChartDataItem[] {
  if (rows.length === 0) return [];
  const first = rows[0];
  if (!first || typeof first !== "object") return [];
  const keys = Object.keys(first);
  const nameKey = keys.find((k) => k.toLowerCase() === "name") ?? keys[0];
  const numericKeys = keys.filter(
    (k) => k !== nameKey && typeof (first as Record<string, unknown>)[k] === "number"
  );
  if (numericKeys.length === 0) {
    const anyNum = keys.find((k) => k !== nameKey);
    if (anyNum) numericKeys.push(anyNum);
  }
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const item: ChartDataItem = {
      name: String(r[nameKey] ?? ""),
    };
    for (const k of numericKeys) {
      const v = r[k];
      item[k] = typeof v === "number" ? v : Number(v) || 0;
    }
    return item;
  });
}

/**
 * 执行 chartQueries 中的 SQL，生成 report.chartOptions（按 id 索引）
 */
export async function runSqlAndBuildChartOptions(
  conn: DuckDBConnection,
  chartQueries: SqlChartQuery[]
): Promise<ReportChartOptions> {
  const result: ReportChartOptions = {};
  for (const q of chartQueries) {
    try {
      const rows = await executeReadOnlyQuery(conn, q.sql);
      const data = rowsToChartData(rows);
      if (data.length > 0) {
        result[q.id] = buildEChartsOptionFromData(data, q.chartType);
      }
    } catch {
      // 单图失败不阻断，该 id 不写入
    }
  }
  return result;
}

/**
 * 解析 SQL 报告 JSON、执行 SQL、组装 analysis 与 chartOptions 的完整流程
 * 调用方负责 openDb/loadParsedData/closeDb，此处仅接收已载入数据的 conn
 */
export async function runSqlReportPipeline(
  conn: DuckDBConnection,
  responseContent: string,
  outline: ReportOutline
): Promise<
  | { success: true; analysis: AnalysisResult; chartOptions: ReportChartOptions; chartIds: string[] }
  | { success: false; error: string }
> {
  const payload = parseSqlPayload(responseContent);
  if (!payload) {
    return { success: false, error: "无法从响应中提取 SQL 报告 JSON" };
  }

  const analysis = await runSqlAndBuildAnalysis(conn, payload);
  const chartSectionCount = outline.sections.filter(
    (s) => s.enabled && s.type === "chart"
  ).length;
  const chartQueries = payload.chartQueries.slice(0, Math.max(chartSectionCount, 1));
  const chartIds = chartQueries.map((c) => c.id);
  const chartOptions = await runSqlAndBuildChartOptions(conn, chartQueries);

  return { success: true, analysis, chartOptions, chartIds };
}
