import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';
import {
  REPORT_WITH_OUTLINE_SYSTEM_PROMPT,
  buildReportWithOutlinePrompt,
  ENHANCED_REPORT_SYSTEM_PROMPT,
  buildEnhancedReportPrompt,
} from '@/lib/ai/prompt';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { dataToCSVString, getDataSummary } from '@/lib/excel-parser';
import { saveReport } from '@/lib/storage';
import { analyzeData, generateAnalysisSummary, generateCitationList, selectBestChart, getDataRichness } from '@/lib/data-analyzer';
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

        // Prepare content
        let rawData: Record<string, unknown>[] = [];
        let userPrompt: string;
        let systemPrompt: string;
        let selectedChart: ChartCandidate | null = null;
        /** 数据导入模式下的分析结果，用于解析多图表 ID */
        let dataAnalysis: DataAnalysis | null = null;

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
          // 数据导入模式：使用增强版数据分析引擎
          const list = dataList && dataList.length > 0 ? dataList : (data ? [data] : []);
          if (list.length === 0) {
            sendEvent({ type: 'error', message: '请上传数据文件' });
            controller.close();
            return;
          }

          // 收集原始数据
          for (const item of list) {
            rawData.push(...item.rows);
          }

          sendEvent({ type: 'progress', section: '正在分析数据结构...', progress: 10 });

          // === 核心改进：使用数据分析引擎 ===
          const names = fileNames || extractFileNames(list);
          const analysis = analyzeData(list, names);
          dataAnalysis = analysis;

          sendEvent({ type: 'progress', section: '正在计算统计指标...', progress: 20 });

          // 生成分析摘要（供 AI 理解）
          const analysisSummary = generateAnalysisSummary(analysis);

          sendEvent({ type: 'progress', section: '正在生成图表候选...', progress: 30 });

          // 选择最佳图表（单图表回退）
          selectedChart = selectBestChart(analysis);

          // 数据丰富度：决定多图表、多章节
          const richness = getDataRichness(analysis);
          const maxCandidates = richness.isRich ? Math.min(analysis.suggestedCharts.length, 6) : 5;

          // 准备图表候选列表供 AI 选择
          const chartCandidatesForAI = analysis.suggestedCharts.slice(0, maxCandidates).map((c) => ({
            id: c.id,
            title: c.title,
            chartType: c.chartType,
            description: c.description,
            dataPointCount: c.data.length,
            source: c.source,
          }));

          // 可引用统计清单（供 prompt 前置，约束模型只引用这些数字）
          const citationList = generateCitationList(analysis);
          const outlineJson = JSON.stringify(outline, null, 2);
          userPrompt = buildEnhancedReportPrompt(
            outlineJson,
            analysisSummary,
            JSON.stringify(chartCandidatesForAI, null, 2),
            richness,
            citationList
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

        // 解析 AI 响应
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          sendEvent({ type: 'error', message: '无法解析报告内容' });
          controller.close();
          return;
        }

        const aiResult = JSON.parse(jsonMatch[0]) as AnalysisResult & {
          selectedChartId?: string;
          selectedChartIds?: string[];
        };

        // 构建最终分析结果
        const analysis: AnalysisResult = {
          summary: aiResult.summary || '报告已生成',
          keyMetrics: Array.isArray(aiResult.keyMetrics) ? aiResult.keyMetrics : [],
          insights: Array.isArray(aiResult.insights) ? aiResult.insights : [],
          recommendations: Array.isArray(aiResult.recommendations) ? aiResult.recommendations : [],
          chartData: undefined,
          chartType: undefined,
          charts: undefined,
        };

        // 后处理：纠正「总播放量」等单位易错项（模型常误写为 3.88万、3.88万万）
        if (mode === 'import' && dataAnalysis) {
          let playSum: number | null = null;
          for (const file of dataAnalysis.files) {
            const stats = file.numericStats?.['播放量万'];
            if (stats != null) {
              playSum = stats.sum;
              break;
            }
          }
          if (playSum != null && playSum >= 1000) {
            const correctValue = playSum >= 10000 ? `${(playSum / 10000).toFixed(2)}亿` : `${playSum}万`;
            for (const m of analysis.keyMetrics) {
              if ((m.label?.includes('总播放量') || m.label?.includes('播放量合计')) && typeof m.value === 'string') {
                const v = m.value.replace(/,/g, '');
                if (/^[\d.]+万万?$/.test(v) || (v === '3.88万') || (v === '3.88万万')) {
                  m.value = correctValue;
                }
              }
            }
          }
          // 纠正 summary 与 insights 中的「X.XX万万」→「X.XX亿」（如 1.11万万 实为 1.11亿）
          const fixWanWan = (s: string) =>
            s.replace(/([\d.]+)万万/g, (_, p1) => {
              const num = parseFloat(p1);
              return num >= 0.1 && num < 1000 ? `${p1}亿` : `${p1}万`;
            });
          if (typeof analysis.summary === 'string') analysis.summary = fixWanWan(analysis.summary);
          analysis.insights = analysis.insights.map(fixWanWan);
        }

        // === 多图表 或 单图表：使用服务端预计算数据 ===
        if (mode === 'import' && dataAnalysis) {
          const chartById = new Map(dataAnalysis.suggestedCharts.map((c) => [c.id, c]));

          const ids = Array.isArray(aiResult.selectedChartIds) && aiResult.selectedChartIds.length > 0
            ? aiResult.selectedChartIds
            : aiResult.selectedChartId
              ? [aiResult.selectedChartId]
              : selectedChart
                ? [selectedChart.id]
                : [];

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
        } else if (aiResult.chartData && aiResult.chartType) {
          analysis.chartData = aiResult.chartData;
          analysis.chartType = aiResult.chartType;
        }

        sendEvent({ type: 'progress', section: '正在保存报告...', progress: 96 });

        // 创建并保存报告
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
