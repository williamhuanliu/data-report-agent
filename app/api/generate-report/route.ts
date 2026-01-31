import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';
import { REPORT_WITH_OUTLINE_SYSTEM_PROMPT, buildReportWithOutlinePrompt } from '@/lib/ai/prompt';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { dataToCSVString, getDataSummary } from '@/lib/excel-parser';
import { saveReport } from '@/lib/storage';
import type { CreateMode, ParsedData, ReportOutline, Report, AnalysisResult } from '@/lib/types';

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

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { mode, idea, pastedContent, data, outline, theme, title } = body as {
          mode: CreateMode;
          idea?: string;
          pastedContent?: string;
          data?: ParsedData;
          outline: ReportOutline;
          theme: string;
          title: string;
        };

        if (!outline || !outline.sections) {
          sendEvent({ type: 'error', message: '缺少报告大纲' });
          controller.close();
          return;
        }

        const enabledSections = outline.sections.filter((s) => s.enabled);
        const totalSections = enabledSections.length;

        // Prepare content
        let content = '';
        let rawData: Record<string, unknown>[] = [];

        if (mode === 'generate') {
          content = idea?.trim() || '';
        } else if (mode === 'paste') {
          content = pastedContent?.trim() || '';
        } else if (mode === 'import' && data) {
          const csvString = dataToCSVString(data.rows);
          const summary = getDataSummary(data);
          content = `${summary}\n\n数据内容（CSV）：\n${csvString}`;
          rawData = data.rows;
        }

        // Send progress: starting
        sendEvent({ type: 'progress', section: '准备中...', progress: 5 });

        // Generate report with AI
        const outlineJson = JSON.stringify(outline, null, 2);
        const userPrompt = buildReportWithOutlinePrompt(mode, content, outlineJson);

        sendEvent({ type: 'progress', section: '正在生成摘要...', progress: 15 });

        const defaultModel = getDefaultOpenRouterModel();
        const response = await getOpenRouterClient().chat.completions.create({
          model: defaultModel,
          messages: [
            { role: 'system', content: REPORT_WITH_OUTLINE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        });

        const responseContent = response.choices[0]?.message?.content;
        if (!responseContent) {
          sendEvent({ type: 'error', message: 'AI 返回内容为空' });
          controller.close();
          return;
        }

        // Simulate section-by-section progress
        for (let i = 0; i < totalSections; i++) {
          const section = enabledSections[i];
          const progress = 20 + Math.round((i / totalSections) * 70);
          sendEvent({ type: 'progress', section: `正在生成：${section.title}`, progress });
          await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay for UX
        }

        sendEvent({ type: 'progress', section: '正在保存报告...', progress: 95 });

        // Parse analysis result
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          sendEvent({ type: 'error', message: '无法解析报告内容' });
          controller.close();
          return;
        }

        const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;

        // Validate
        if (!analysis.summary) {
          analysis.summary = '报告已生成';
        }
        if (!Array.isArray(analysis.keyMetrics)) {
          analysis.keyMetrics = [];
        }
        if (!Array.isArray(analysis.insights)) {
          analysis.insights = [];
        }
        if (!Array.isArray(analysis.recommendations)) {
          analysis.recommendations = [];
        }

        // Create and save report
        const report: Report = {
          id: nanoid(10),
          title: title || outline.title || `数据报告 - ${new Date().toLocaleDateString('zh-CN')}`,
          createdAt: new Date().toISOString(),
          rawData,
          analysis,
          aiProvider: 'openrouter',
          openrouterModel: defaultModel,
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
