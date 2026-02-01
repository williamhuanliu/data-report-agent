import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  OUTLINE_SYSTEM_PROMPT,
  buildOutlinePrompt,
  ENHANCED_OUTLINE_SYSTEM_PROMPT,
  buildEnhancedOutlinePrompt,
} from '@/lib/ai/prompt';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { analyzeData, generateAnalysisSummary, getDataRichness } from '@/lib/data-analyzer';
import type { CreateMode, ParsedData, ReportOutline } from '@/lib/types';

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
  try {
    const body = await request.json();
    const { mode, idea, pastedContent, data, dataList, title, model, fileNames } = body as {
      mode: CreateMode;
      idea?: string;
      pastedContent?: string;
      data?: ParsedData;
      dataList?: ParsedData[];
      title?: string;
      model?: string;
      fileNames?: string[];
    };
    const chatModel = model || getDefaultOpenRouterModel();

    let userPrompt = '';
    let systemPrompt = '';

    if (mode === 'generate') {
      if (!idea?.trim()) {
        return NextResponse.json({ error: '请输入报告主题' }, { status: 400 });
      }
      userPrompt = buildOutlinePrompt(mode, idea.trim(), title);
      systemPrompt = OUTLINE_SYSTEM_PROMPT;

    } else if (mode === 'paste') {
      if (!pastedContent?.trim()) {
        return NextResponse.json({ error: '请粘贴内容' }, { status: 400 });
      }
      userPrompt = buildOutlinePrompt(mode, pastedContent.trim(), title);
      systemPrompt = OUTLINE_SYSTEM_PROMPT;

    } else if (mode === 'import') {
      const list = dataList && dataList.length > 0 ? dataList : (data ? [data] : []);
      if (list.length === 0 || list.every((d) => !d?.rows?.length)) {
        return NextResponse.json({ error: '请上传数据文件' }, { status: 400 });
      }

      // === 核心改进：使用数据分析引擎生成增强摘要 ===
      const names = fileNames || list.map((_, i) => `文件${i + 1}`);
      const analysis = analyzeData(list, names);
      const analysisSummary = generateAnalysisSummary(analysis);
      const richness = getDataRichness(analysis);

      // 使用增强版 Prompt（传入丰富度以支持多章节、多图表章节）
      userPrompt = buildEnhancedOutlinePrompt(analysisSummary, title, richness);
      systemPrompt = ENHANCED_OUTLINE_SYSTEM_PROMPT;

    } else {
      return NextResponse.json({ error: '无效的创建模式' }, { status: 400 });
    }

    const response = await getOpenRouterClient().chat.completions.create({
      model: chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('AI 返回内容为空');
    }

    // Extract JSON
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从响应中提取大纲');
    }

    const outline = JSON.parse(jsonMatch[0]) as ReportOutline;

    // Validate outline structure
    if (!outline.title || !Array.isArray(outline.sections)) {
      throw new Error('大纲格式不正确');
    }

    return NextResponse.json({ success: true, outline });
  } catch (error) {
    console.error('生成大纲失败:', error);
    const message = error instanceof Error ? error.message : '生成大纲时发生错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
