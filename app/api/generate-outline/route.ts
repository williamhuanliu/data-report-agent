import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  OUTLINE_SYSTEM_PROMPT,
  buildOutlinePrompt,
  ENHANCED_OUTLINE_SYSTEM_PROMPT,
  buildEnhancedOutlinePrompt,
  OUTLINE_MERGE_SYSTEM_PROMPT,
  buildOutlineMergePrompt,
} from '@/lib/ai/prompt';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { getAnalysisInput } from '@/lib/data-analyzer';
import type { CreateMode, ParsedData, ReportOutline, OutlineSectionType } from '@/lib/types';

let openrouter: OpenAI | null = null;

const SINGLE_OCCURRENCE_TYPES: OutlineSectionType[] = ['summary', 'metrics', 'insight', 'recommendation'];

function hasDuplicateSectionTypes(outline: ReportOutline): boolean {
  const counts = new Map<OutlineSectionType, number>();
  for (const s of outline.sections) {
    if (!SINGLE_OCCURRENCE_TYPES.includes(s.type as OutlineSectionType)) continue;
    counts.set(s.type as OutlineSectionType, (counts.get(s.type as OutlineSectionType) ?? 0) + 1);
  }
  return [...counts.values()].some((c) => c > 1);
}

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

      // === 统一分析入口：getAnalysisInput ===
      const names = fileNames || list.map((_, i) => `文件${i + 1}`);
      const input = getAnalysisInput(list, names);

      userPrompt = buildEnhancedOutlinePrompt(input.analysisSummary, title, input.dataRichness);
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

    let outline = JSON.parse(jsonMatch[0]) as ReportOutline;

    // Validate outline structure
    if (!outline.title || !Array.isArray(outline.sections)) {
      throw new Error('大纲格式不正确');
    }

    // 同类型章节重复时交给模型合并（如多个「核心洞察」合并为一节）
    if (hasDuplicateSectionTypes(outline)) {
      try {
        const mergeResponse = await getOpenRouterClient().chat.completions.create({
          model: chatModel,
          messages: [
            { role: 'system', content: OUTLINE_MERGE_SYSTEM_PROMPT },
            { role: 'user', content: buildOutlineMergePrompt(JSON.stringify(outline, null, 2)) },
          ],
          temperature: 0.2,
        });
        const mergeContent = mergeResponse.choices[0]?.message?.content;
        if (mergeContent) {
          const mergeMatch = mergeContent.match(/\{[\s\S]*\}/);
          if (mergeMatch) {
            const merged = JSON.parse(mergeMatch[0]) as ReportOutline;
            if (merged.title && Array.isArray(merged.sections)) outline = merged;
          }
        }
      } catch (mergeErr) {
        console.warn('大纲合并失败，使用原始大纲:', mergeErr);
      }
    }

    return NextResponse.json({ success: true, outline });
  } catch (error) {
    console.error('生成大纲失败:', error);
    const message = error instanceof Error ? error.message : '生成大纲时发生错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
