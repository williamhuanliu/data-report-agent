import { NextRequest, NextResponse } from 'next/server';
import { chatWithData, type ChatMessage } from '@/lib/ai/chat';
import type { AIProvider } from '@/lib/types';
import type { ParsedData } from '@/lib/excel-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, provider, model, messages } = body as {
      data: ParsedData;
      provider: AIProvider;
      model?: string;
      messages: ChatMessage[];
    };

    if (!data?.rows?.length) {
      return NextResponse.json({ error: '请提供有效的数据' }, { status: 400 });
    }
    if (!provider || !['openai', 'anthropic', 'openrouter'].includes(provider)) {
      return NextResponse.json({ error: '请选择有效的 AI 服务商' }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '请发送至少一条消息' }, { status: 400 });
    }

    const content = await chatWithData(data, provider, messages, model);
    return NextResponse.json({ content });
  } catch (error) {
    console.error('对话失败:', error);
    const message = error instanceof Error ? error.message : '对话过程中发生错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
