/**
 * 报告生成 - 服务入口
 * 职责：校验请求 → 构建上下文 → 调用 LLM → 运行后处理管道 → 保存报告 → 通过 onEvent 推送进度/完成/错误
 */

import { nanoid } from "nanoid";
import {
  getOpenRouterClient,
  getDefaultOpenRouterModel,
} from "@/lib/ai/openrouter";
import { saveReport } from "@/lib/storage";
import type { Report } from "@/lib/types";
import {
  checkAnalysisQuality,
  checkCrossFileInsight,
} from "@/lib/report-quality";
import {
  buildReportContext,
  buildStructuredReportContext,
} from "./report-context";
import { runReportPipeline, runStructuredPipeline } from "./report-pipeline";
import {
  buildChartOptionsFromCandidates,
  resolveSelectedChartIds,
} from "./chart-options";
import { buildReportHtmlFromStructured } from "./html-template";
import { validateOutlineForImport } from "@/lib/generation/outline/outline-validation";
import type { ReportRequest, ReportStreamEvent } from "./types";

function emit(
  options: { onEvent?: (e: ReportStreamEvent) => void },
  event: ReportStreamEvent
) {
  options.onEvent?.(event);
}

/**
 * 执行报告生成：校验 → 上下文 → LLM → 管道（解析/归一化/图表）→ 保存 → 推送事件
 * 通过 onEvent 回调推送 progress / complete / error，便于 API 层转成 SSE
 */
export async function runReportGeneration(
  request: ReportRequest,
  options: { onEvent?: (e: ReportStreamEvent) => void } = {}
): Promise<{ reportId: string }> {
  const { outline, mode, theme, title } = request;

  if (!outline?.sections?.length) {
    const msg = "缺少报告大纲";
    emit(options, { type: "error", message: msg });
    throw new Error(msg);
  }

  const enabledSections = outline.sections.filter((s) => s.enabled);
  const totalSections = enabledSections.length;
  const model = request.model ?? getDefaultOpenRouterModel();

  if (mode === "import") {
    const list = request.dataList?.length
      ? request.dataList
      : request.data
      ? [request.data]
      : [];
    if (list.length === 0) {
      const msg = "请上传数据文件";
      emit(options, { type: "error", message: msg });
      throw new Error(msg);
    }
  }

  if (mode !== "generate" && mode !== "paste" && mode !== "import") {
    const msg = "无效的创建模式";
    emit(options, { type: "error", message: msg });
    throw new Error(msg);
  }

  emit(options, { type: "progress", section: "准备中...", progress: 5 });

  const context = buildReportContext({
    mode,
    idea: request.idea,
    pastedContent: request.pastedContent,
    data: request.data,
    dataList: request.dataList,
    outline,
    title,
    fileNames: request.fileNames,
  });

  if (mode === "import" && context.importPayload) {
    emit(options, {
      type: "progress",
      section: "正在分析数据结构...",
      progress: 10,
    });
    emit(options, {
      type: "progress",
      section: "正在计算统计指标...",
      progress: 20,
    });
    emit(options, {
      type: "progress",
      section: "正在生成图表候选...",
      progress: 30,
    });
    return runImportReportGeneration(request, context, options);
  }

  // generate / paste：单次 HTML 生成（兼容）
  emit(options, {
    type: "progress",
    section: "正在生成分析报告...",
    progress: 40,
  });

  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: context.systemPrompt },
      { role: "user", content: context.userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 32768,
  });

  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    const msg = "AI 返回内容为空";
    emit(options, { type: "error", message: msg });
    throw new Error(msg);
  }

  for (let i = 0; i < totalSections; i++) {
    const section = enabledSections[i];
    const progress = 50 + Math.round((i / totalSections) * 40);
    emit(options, {
      type: "progress",
      section: `正在生成：${section.title}`,
      progress,
    });
    await new Promise((r) => setTimeout(r, 200));
  }

  emit(options, { type: "progress", section: "正在整合报告...", progress: 92 });

  const pipelineResult = await runReportPipeline({
    responseContent,
    mode,
    outline,
  });

  if (!pipelineResult.success) {
    emit(options, { type: "error", message: pipelineResult.error });
    throw new Error(pipelineResult.error);
  }

  emit(options, { type: "progress", section: "正在保存报告...", progress: 96 });

  const rawData = context.importPayload?.rawData ?? [];
  const meta: NonNullable<Report["meta"]> = {};
  if (context.importPayload?.citationList?.length) {
    meta.citationList = context.importPayload.citationList.slice(0, 20);
  }
  const ideaTrim = request.idea?.trim();
  const reportTitle =
    ideaTrim && ideaTrim.length > 0
      ? ideaTrim.length <= 80
        ? ideaTrim
        : ideaTrim.slice(0, 77) + "…"
      : title ||
        outline.title ||
        `数据报告 - ${new Date().toLocaleDateString("zh-CN")}`;
  const reportOutline =
    ideaTrim && outline ? { ...outline, title: reportTitle } : outline;

  const report: Report = {
    id: nanoid(10),
    title: reportTitle,
    createdAt: new Date().toISOString(),
    rawData,
    analysis: pipelineResult.analysis,
    aiProvider: "openrouter",
    openrouterModel: model,
    theme,
    outline: reportOutline,
    ...(ideaTrim ? { userIdea: ideaTrim } : {}),
    contentHtml: pipelineResult.contentHtml,
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };

  await saveReport(report);
  emit(options, { type: "progress", section: "完成！", progress: 100 });
  emit(options, { type: "complete", reportId: report.id });
  return { reportId: report.id };
}

/** import 模式：结构化生成 → 模板 HTML + chartOptions */
async function runImportReportGeneration(
  request: ReportRequest,
  context: ReturnType<typeof buildReportContext>,
  options: { onEvent?: (e: ReportStreamEvent) => void }
): Promise<{ reportId: string }> {
  const { theme, title } = request;
  let outline = request.outline;
  const model = request.model ?? getDefaultOpenRouterModel();
  const payload = context.importPayload!;
  const { citationList, suggestedCharts, dataAnalysis, rawData } = payload;

  outline = validateOutlineForImport(outline, dataAnalysis);

  emit(options, {
    type: "progress",
    section: "正在生成分析报告（结构化）...",
    progress: 40,
  });

  const structuredContext = buildStructuredReportContext({
    outline,
    citationList,
    suggestedCharts,
    idea: request.idea,
  });

  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: structuredContext.systemPrompt },
      { role: "user", content: structuredContext.userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  });

  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    const msg = "AI 返回内容为空";
    emit(options, { type: "error", message: msg });
    throw new Error(msg);
  }

  const pipelineResult = runStructuredPipeline(responseContent);
  if (!pipelineResult.success) {
    emit(options, { type: "error", message: pipelineResult.error });
    throw new Error(pipelineResult.error);
  }

  const { analysis, selectedChartIds } = pipelineResult;
  const chartSectionCount = outline.sections.filter(
    (s) => s.enabled && s.type === "chart"
  ).length;
  const resolvedChartIds = resolveSelectedChartIds(
    selectedChartIds,
    suggestedCharts,
    Math.max(chartSectionCount, 1)
  );
  const chartOptions = buildChartOptionsFromCandidates(
    suggestedCharts,
    resolvedChartIds
  );
  const contentHtml = buildReportHtmlFromStructured(
    outline,
    analysis,
    resolvedChartIds
  );

  emit(options, { type: "progress", section: "正在保存报告...", progress: 96 });

  const qualityWarnings: string[] = [];
  const analysisQuality = checkAnalysisQuality(analysis, citationList);
  qualityWarnings.push(
    ...analysisQuality.citationWarnings,
    ...analysisQuality.noRecordWarnings
  );
  const crossFileResult = checkCrossFileInsight(analysis, dataAnalysis);
  if (!crossFileResult.hasCrossFileInsight && crossFileResult.warning) {
    qualityWarnings.push(crossFileResult.warning);
  }

  const ideaTrim = request.idea?.trim();
  const reportTitle =
    ideaTrim && ideaTrim.length > 0
      ? ideaTrim.length <= 80
        ? ideaTrim
        : ideaTrim.slice(0, 77) + "…"
      : title ||
        outline.title ||
        `数据报告 - ${new Date().toLocaleDateString("zh-CN")}`;
  const reportOutline =
    ideaTrim && outline ? { ...outline, title: reportTitle } : outline;

  const meta: NonNullable<Report["meta"]> = {
    citationList: citationList.slice(0, 20),
    ...(qualityWarnings.length > 0 ? { qualityWarnings } : {}),
  };

  const report: Report = {
    id: nanoid(10),
    title: reportTitle,
    createdAt: new Date().toISOString(),
    rawData,
    analysis,
    aiProvider: "openrouter",
    openrouterModel: model,
    theme,
    outline: reportOutline,
    ...(ideaTrim ? { userIdea: ideaTrim } : {}),
    contentHtml,
    chartOptions:
      Object.keys(chartOptions).length > 0 ? chartOptions : undefined,
    meta,
  };

  await saveReport(report);
  emit(options, { type: "progress", section: "完成！", progress: 100 });
  emit(options, { type: "complete", reportId: report.id });
  return { reportId: report.id };
}
