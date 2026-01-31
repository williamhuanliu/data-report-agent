import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { analyzeData } from '@/lib/ai';
import { saveReport } from '@/lib/storage';
import type { AIProvider, Report } from '@/lib/types';
import type { ParsedData } from '@/lib/excel-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, provider, model, title, customPrompt } = body as {
      data: ParsedData;
      provider: AIProvider;
      model?: string;
      title?: string;
      /** 用户对话中关注的问题，将作为报告生成时的补充说明 */
      customPrompt?: string;
    };

    // 验证请求参数
    if (!data || !data.rows || data.rows.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的数据' },
        { status: 400 }
      );
    }

    if (!provider || !['openai', 'anthropic', 'openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: '请选择有效的 AI 服务商' },
        { status: 400 }
      );
    }

    // 调用 AI 分析（可带入对话中的关注点）
    const analysis = await analyzeData(data, provider, { model, customPrompt });

    // 创建报告
    const report: Report = {
      id: nanoid(10),
      title: title || `数据报告 - ${new Date().toLocaleDateString('zh-CN')}`,
      createdAt: new Date().toISOString(),
      rawData: data.rows,
      analysis,
      aiProvider: provider,
      ...(provider === 'openrouter' && model ? { openrouterModel: model } : {}),
    };

    // 保存报告
    await saveReport(report);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('分析失败:', error);
    
    const message = error instanceof Error ? error.message : '分析过程中发生错误';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
