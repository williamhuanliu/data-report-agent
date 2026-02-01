import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';
import {
  REPORT_WITH_OUTLINE_SYSTEM_PROMPT,
  buildReportWithOutlinePrompt,
  ENHANCED_REPORT_SYSTEM_PROMPT,
  buildEnhancedReportPrompt,
  CHART_SELECT_FALLBACK_SYSTEM_PROMPT,
  buildChartSelectFallbackPrompt,
} from '@/lib/ai/prompt';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { saveReport } from '@/lib/storage';
import { getAnalysisInput, selectBestChart } from '@/lib/data-analyzer';
import { parseAndValidateAnalysisResult, normalizeAnalysisResult, logCitationWarnings, logCrossFileWarning, logQualityScore, logNoRecordWarnings } from '@/lib/report-quality';
import type { CreateMode, ParsedData, ReportOutline, Report, AnalysisResult, ChartCandidate, ReportChart, DataAnalysis } from '@/lib/types';

let openrouter: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openrouter) {
    openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Data Report Agent',
      },
    });
  }
  return openrouter;
}

/** 提取文件名列表 */
function extractFileNames(dataList: ParsedData[]): string[] {
  // 由于 ParsedData 没有 fileName，我们生成默认名称
  return dataList.map((_, i) => `文件${i + 1}`);
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { mode, idea, pastedContent, data, dataList, outline, theme, title, model, fileNames } = body as {
          mode: CreateMode;
          idea?: string;
          pastedContent?: string;
          data?: ParsedData;
          dataList?: ParsedData[];
          outline: ReportOutline;
          theme: string;
          title: string;
          model?: string;
          fileNames?: string[];
        };
        const chatModel = model || getDefaultOpenRouterModel();

        if (!outline || !outline.sections) {
          sendEvent({ type: 'error', message: '缺少报告大纲' });
          controller.close();
          return;
        }

        const enabledSections = outline.sections.filter((s) => s.enabled);
        const totalSections = enabledSections.length;
        /** 大纲中启用的图表章节数，报告阶段据此决定选图数量（由大纲决定） */
        const preferredChartCount = outline.sections.filter((s) => s.enabled && s.type === 'chart').length;

        // Prepare content
        let rawData: Record<string, unknown>[] = [];
        let userPrompt: string;
        let systemPrompt: string;
        let selectedChart: ChartCandidate | null = null;
        /** 数据导入模式下的分析结果，用于解析多图表 ID */
        let dataAnalysis: DataAnalysis | null = null;
        /** 仅可引用的统计清单（import 时生成，供编辑章节时注入） */
        let citationList: string[] | undefined;

        sendEvent({ type: 'progress', section: '准备中...', progress: 5 });

        if (mode === 'generate') {
          // 纯描述模式：使用传统 Prompt
          const content = idea?.trim() || '';
          const outlineJson = JSON.stringify(outline, null, 2);
          userPrompt = buildReportWithOutlinePrompt(mode, content, outlineJson);
          systemPrompt = REPORT_WITH_OUTLINE_SYSTEM_PROMPT;

        } else if (mode === 'paste') {
          // 粘贴模式：使用传统 Prompt
          const content = pastedContent?.trim() || '';
          const outlineJson = JSON.stringify(outline, null, 2);
          userPrompt = buildReportWithOutlinePrompt(mode, content, outlineJson);
          systemPrompt = REPORT_WITH_OUTLINE_SYSTEM_PROMPT;

        } else if (mode === 'import') {
          // 数据导入模式：使用统一分析入口 getAnalysisInput
          const list = dataList && dataList.length > 0 ? dataList : (data ? [data] : []);
          if (list.length === 0) {
            sendEvent({ type: 'error', message: '请上传数据文件' });
            controller.close();
            return;
          }

          for (const item of list) {
            rawData.push(...item.rows);
          }

          sendEvent({ type: 'progress', section: '正在分析数据结构...', progress: 10 });

          const names = fileNames || extractFileNames(list);
          const input = getAnalysisInput(list, names);
          dataAnalysis = input.dataAnalysis;
          citationList = input.citationList;

          sendEvent({ type: 'progress', section: '正在计算统计指标...', progress: 20 });
          sendEvent({ type: 'progress', section: '正在生成图表候选...', progress: 30 });

          selectedChart = selectBestChart(input.dataAnalysis);
          const maxCandidates = input.dataRichness.isRich
            ? Math.min(input.suggestedCharts.length, 6)
            : 5;
          const chartCandidatesForAI = input.suggestedCharts.slice(0, maxCandidates).map((c) => ({
            id: c.id,
            title: c.title,
            chartType: c.chartType,
            description: c.description,
            dataPointCount: c.data.length,
            source: c.source,
          }));

          const outlineJson = JSON.stringify(outline, null, 2);
          userPrompt = buildEnhancedReportPrompt(
            outlineJson,
            input.analysisSummary,
            JSON.stringify(chartCandidatesForAI, null, 2),
            input.dataRichness,
            citationList,
            preferredChartCount > 0 ? preferredChartCount : undefined
          );
          systemPrompt = ENHANCED_REPORT_SYSTEM_PROMPT;

        } else {
          sendEvent({ type: 'error', message: '无效的创建模式' });
          controller.close();
          return;
        }

        sendEvent({ type: 'progress', section: '正在生成分析报告...', progress: 40 });

        // 调用 AI 生成报告
        const response = await getOpenRouterClient().chat.completions.create({
          model: chatModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        });

        const responseContent = response.choices[0]?.message?.content;
        if (!responseContent) {
          sendEvent({ type: 'error', message: 'AI 返回内容为空' });
          controller.close();
          return;
        }

        // 模拟章节进度
        for (let i = 0; i < totalSections; i++) {
          const section = enabledSections[i];
          const progress = 50 + Math.round((i / totalSections) * 40);
          sendEvent({ type: 'progress', section: `正在生成：${section.title}`, progress });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        sendEvent({ type: 'progress', section: '正在整合报告...', progress: 92 });

        // 解析并校验 AI 响应（报告质量管道）
        const parsed = parseAndValidateAnalysisResult(responseContent);
        if (!parsed.success) {
          sendEvent({ type: 'error', message: parsed.error });
          controller.close();
          return;
        }

        // 归一化数值与单位（万/亿、总播放量等）
        const analysis = normalizeAnalysisResult(parsed.data, mode === 'import' ? dataAnalysis : null);

        // 可选：引用检查（万/亿等价匹配；超过阈值时打 log 建议复检/重试）
        if (mode === 'import' && citationList && citationList.length > 0) {
          logCitationWarnings(analysis, citationList, { strictThreshold: 5 });
        }
        // 跨文件洞察事后校验（存在跨文件统计时至少一条相关洞察）
        if (mode === 'import' && dataAnalysis) {
          logCrossFileWarning(analysis, dataAnalysis);
        }
        // 质量分与无记录表述检测（仅打 log，供调试/可观测）
        if (mode === 'import') {
          logQualityScore(analysis, citationList, dataAnalysis ?? undefined);
          logNoRecordWarnings(analysis);
        }

        // === 多图表 或 单图表：使用服务端预计算数据（图表 ID 白名单校验） ===
        if (mode === 'import' && dataAnalysis) {
          const chartById = new Map(dataAnalysis.suggestedCharts.map((c) => [c.id, c]));
          const validIds = new Set(chartById.keys());
          let ids = Array.isArray(parsed.data.selectedChartIds) && parsed.data.selectedChartIds.length > 0
            ? parsed.data.selectedChartIds
            : parsed.data.selectedChartId
              ? [parsed.data.selectedChartId]
              : selectedChart
                ? [selectedChart.id]
                : [];

          const invalidIds = ids.filter((id) => !validIds.has(id));
          if (invalidIds.length > 0) {
            console.warn('[generate-report] Invalid chart ids (fallback to valid candidates):', invalidIds);
          }
          ids = ids.filter((id) => validIds.has(id));

          if (ids.length === 0 && dataAnalysis.suggestedCharts.length > 0) {
            try {
              const fallbackCandidates = dataAnalysis.suggestedCharts.slice(0, 6).map((c) => ({
                id: c.id,
                title: c.title,
                description: c.description,
              }));
              const fallbackRes = await getOpenRouterClient().chat.completions.create({
                model: chatModel,
                messages: [
                  { role: 'system', content: CHART_SELECT_FALLBACK_SYSTEM_PROMPT },
                  {
                    role: 'user',
                    content: buildChartSelectFallbackPrompt(
                      JSON.stringify(outline, null, 2),
                      JSON.stringify(fallbackCandidates, null, 2)
                    ),
                  },
                ],
                temperature: 0.2,
                max_tokens: 512,
              });
              const fallbackContent = fallbackRes.choices[0]?.message?.content;
              if (fallbackContent) {
                const fallbackMatch = fallbackContent.match(/\{[\s\S]*\}/);
                if (fallbackMatch) {
                  const parsed = JSON.parse(fallbackMatch[0]) as { selectedChartIds?: string[] };
                  const chosen = Array.isArray(parsed?.selectedChartIds) ? parsed.selectedChartIds : [];
                  ids = chosen.filter((id) => validIds.has(id));
                }
              }
            } catch (fallbackErr) {
              console.warn('图表重选失败，使用代码 fallback:', fallbackErr);
            }
            if (ids.length === 0) {
              ids = selectedChart
                ? [selectedChart.id]
                : dataAnalysis.suggestedCharts.slice(0, 2).map((c) => c.id);
            }
          }

          const resolvedCharts: ReportChart[] = [];
          for (const id of ids) {
            const c = chartById.get(id);
            if (c && c.data.length > 0) {
              resolvedCharts.push({ title: c.title, data: c.data, chartType: c.chartType });
            }
          }

          if (resolvedCharts.length > 1) {
            analysis.charts = resolvedCharts;
          } else if (resolvedCharts.length === 1) {
            analysis.chartData = resolvedCharts[0].data;
            analysis.chartType = resolvedCharts[0].chartType;
          } else if (selectedChart) {
            analysis.chartData = selectedChart.data;
            analysis.chartType = selectedChart.chartType;
          }
        } else if (parsed.data.chartData?.length && parsed.data.chartType) {
          analysis.chartData = parsed.data.chartData;
          analysis.chartType = parsed.data.chartType;
        }

        sendEvent({ type: 'progress', section: '正在保存报告...', progress: 96 });

        // 创建并保存报告（import 模式存入 citationList 供编辑章节时数据 grounded）
        const report: Report = {
          id: nanoid(10),
          title: title || outline.title || `数据报告 - ${new Date().toLocaleDateString('zh-CN')}`,
          createdAt: new Date().toISOString(),
          rawData,
          analysis,
          aiProvider: 'openrouter',
          openrouterModel: chatModel,
          theme,
          outline,
          ...(citationList && citationList.length > 0
            ? { meta: { citationList: citationList.slice(0, 20) } }
            : {}),
        };

        await saveReport(report);

        sendEvent({ type: 'progress', section: '完成！', progress: 100 });
        sendEvent({ type: 'complete', reportId: report.id });

        controller.close();
      } catch (error) {
        console.error('生成报告失败:', error);
        const message = error instanceof Error ? error.message : '生成报告时发生错误';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
