import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { analyzeFromIdea } from '@/lib/ai';
import { saveReport } from '@/lib/storage';
import type { AIProvider, Report } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea, provider, model, title } = body as {
      idea: string;
      provider: AIProvider;
      model?: string;
      title?: string;
    };

    const trimmedIdea = typeof idea === 'string' ? idea.trim() : '';
    if (!trimmedIdea) {
      return NextResponse.json(
        { error: '请提供想法描述' },
        { status: 400 }
      );
    }

    if (!provider || provider !== 'openrouter') {
      return NextResponse.json(
        { error: '仅描述生成当前仅支持 OpenRouter' },
        { status: 400 }
      );
    }

    const analysis = await analyzeFromIdea(trimmedIdea, provider, { model });

    const report: Report = {
      id: nanoid(10),
      title: title?.trim() || `想法报告 - ${new Date().toLocaleDateString('zh-CN')}`,
      createdAt: new Date().toISOString(),
      rawData: [],
      analysis,
      aiProvider: provider,
      ...(provider === 'openrouter' && model ? { openrouterModel: model } : {}),
    };

    await saveReport(report);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('仅想法生成失败:', error);

    const message = error instanceof Error ? error.message : '生成过程中发生错误';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
