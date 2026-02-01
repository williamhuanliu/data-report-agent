import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { getReport } from '@/lib/storage';

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

const EDIT_SYSTEM_PROMPT_BASE = `你是一位专业的数据报告编辑。根据用户的指令修改报告内容。

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
    const { reportId, sectionType, currentContent, instruction, model } = body as {
      reportId?: string;
      sectionType: string;
      currentContent: unknown;
      instruction: string;
      model?: string;
    };
    const chatModel = model || getDefaultOpenRouterModel();

    if (!sectionType || currentContent === undefined || !instruction) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 若有 reportId，加载报告并注入引用清单（数据 grounded 编辑）
    let systemPrompt = EDIT_SYSTEM_PROMPT_BASE;
    if (reportId) {
      const report = await getReport(reportId);
      if (report?.meta?.citationList && report.meta.citationList.length > 0) {
        const list = report.meta.citationList.slice(0, 20);
        systemPrompt += `

## 数据约束（务必遵守）
本报告有预计算的「仅可引用统计清单」。修改时**只可引用**以下表述中的数字，**不得出现**清单外的具体数值或比例；单位须与清单一致（如清单为「XXX万」或「X.XX亿」，勿写「X.XX万」）。
**缺失数据表述**：若某维度在某时间段无记录（如某歌曲在某月无播放数据），**必须**表述为「XX 在 YY 月后无记录」或「部分月份无数据」，**严禁**写「降至 0」「降幅-100%」「断崖式下跌」「需关注是否下架/版权」等（无记录≠下降至零）。

${list.map((line) => `- ${line}`).join('\n')}`;
      }
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
