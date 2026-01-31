import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';

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

const EDIT_SYSTEM_PROMPT = `你是一位专业的数据报告编辑。根据用户的指令修改报告内容。

规则：
1. 保持原内容的核心信息，除非用户明确要求删除
2. 根据指令调整表述、深度或风格
3. 返回与输入相同的数据结构

对于不同指令的处理：
- rewrite: 用不同的表述重写，保持核心含义
- expand: 增加细节和深度，丰富内容
- simplify: 删减冗余，只保留关键要点
- formal: 调整为正式商务语气

请只返回修改后的内容，格式与输入保持一致。`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionType, currentContent, instruction } = body as {
      reportId: string;
      sectionType: string;
      currentContent: unknown;
      instruction: string;
    };

    if (!sectionType || currentContent === undefined || !instruction) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // Build prompt based on section type
    let contentStr = '';
    let responseFormat = '';

    if (sectionType === 'summary') {
      contentStr = currentContent as string;
      responseFormat = '请返回修改后的摘要文本（不要包含引号或额外格式）';
    } else if (sectionType === 'insights' || sectionType === 'recommendations') {
      contentStr = JSON.stringify(currentContent, null, 2);
      responseFormat = '请返回 JSON 数组格式的字符串列表';
    } else if (sectionType === 'metrics') {
      contentStr = JSON.stringify(currentContent, null, 2);
      responseFormat = '请返回 JSON 数组格式的指标列表，每个指标包含 label, value, trend, changePercent';
    } else if (sectionType === 'chart') {
      contentStr = JSON.stringify(currentContent, null, 2);
      responseFormat = '请返回 JSON 数组格式的图表数据';
    }

    const userPrompt = `当前内容（${sectionType}）：
${contentStr}

用户指令：${instruction}

${responseFormat}`;

    const response = await getOpenRouterClient().chat.completions.create({
      model: getDefaultOpenRouterModel(),
      messages: [
        { role: 'system', content: EDIT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('AI 返回内容为空');
    }

    // Parse response based on section type
    let newContent: unknown;

    if (sectionType === 'summary') {
      // For summary, just use the text directly
      newContent = responseContent.trim().replace(/^["']|["']$/g, '');
    } else {
      // For other types, try to parse JSON
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('无法解析 AI 返回的内容');
      }
      newContent = JSON.parse(jsonMatch[0]);
    }

    return NextResponse.json({ success: true, newContent });
  } catch (error) {
    console.error('编辑章节失败:', error);
    const message = error instanceof Error ? error.message : '编辑时发生错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
