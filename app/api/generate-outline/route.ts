import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OUTLINE_SYSTEM_PROMPT, buildOutlinePrompt } from '@/lib/ai/prompt';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { dataToCSVString, getDataSummary } from '@/lib/excel-parser';
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
    const { mode, idea, pastedContent, data, title } = body as {
      mode: CreateMode;
      idea?: string;
      pastedContent?: string;
      data?: ParsedData;
      title?: string;
    };

    let content = '';

    if (mode === 'generate') {
      if (!idea?.trim()) {
        return NextResponse.json({ error: '请输入报告主题' }, { status: 400 });
      }
      content = idea.trim();
    } else if (mode === 'paste') {
      if (!pastedContent?.trim()) {
        return NextResponse.json({ error: '请粘贴内容' }, { status: 400 });
      }
      content = pastedContent.trim();
    } else if (mode === 'import') {
      if (!data || !data.rows || data.rows.length === 0) {
        return NextResponse.json({ error: '请上传数据文件' }, { status: 400 });
      }
      const csvString = dataToCSVString(data.rows);
      const summary = getDataSummary(data);
      content = `${summary}\n\n数据样本（前10行）：\n${csvString.split('\n').slice(0, 11).join('\n')}`;
    } else {
      return NextResponse.json({ error: '无效的创建模式' }, { status: 400 });
    }

    const userPrompt = buildOutlinePrompt(mode, content, title);

    const response = await getOpenRouterClient().chat.completions.create({
      model: getDefaultOpenRouterModel(),
      messages: [
        { role: 'system', content: OUTLINE_SYSTEM_PROMPT },
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
