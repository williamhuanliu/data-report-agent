import type { AIProvider } from '../types';
import type { ParsedData } from '../excel-parser';
import { getDataSummary, dataToCSVString } from '../excel-parser';
import { DATA_CHAT_SYSTEM_PROMPT, buildDataContextForChat } from './chat-prompt';
import { getDefaultOpenRouterModel } from './openrouter';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

let openaiChat: OpenAI | null = null;
let anthropicChat: Anthropic | null = null;
let openrouterChat: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiChat) openaiChat = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiChat;
}

function getAnthropicClient(): Anthropic {
  if (!anthropicChat) anthropicChat = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicChat;
}

function getOpenRouterClient(): OpenAI {
  if (!openrouterChat) {
    openrouterChat = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Data Report Agent',
      },
    });
  }
  return openrouterChat;
}

/** 限制 CSV 行数用于对话上下文 */
const MAX_CSV_ROWS_FOR_CHAT = 50;

export async function chatWithData(
  data: ParsedData,
  provider: AIProvider,
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const summary = getDataSummary(data);
  const fullCsv = dataToCSVString(data.rows);
  const lines = fullCsv.split('\n');
  const preview = lines.slice(0, MAX_CSV_ROWS_FOR_CHAT + 1).join('\n');
  const dataContext = buildDataContextForChat(summary, preview);

  const systemContent = `${DATA_CHAT_SYSTEM_PROMPT}\n\n${dataContext}`;

  const openAIMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  if (provider === 'openai') {
    const client = getOpenAIClient();
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: openAIMessages as { role: 'user' | 'assistant' | 'system'; content: string }[],
      temperature: 0.4,
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }

  if (provider === 'anthropic') {
    const client = getAnthropicClient();
    const anthropicMessages = messages.map((m) =>
      m.role === 'user' ? { role: 'user' as const, content: m.content } : { role: 'assistant' as const, content: m.content }
    );
    const res = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemContent,
      messages: anthropicMessages,
    });
    const block = res.content[0];
    return block?.type === 'text' ? block.text.trim() : '';
  }

  if (provider === 'openrouter') {
    const client = getOpenRouterClient();
    const res = await client.chat.completions.create({
      model: model || getDefaultOpenRouterModel(),
      messages: openAIMessages as { role: 'user' | 'assistant' | 'system'; content: string }[],
      temperature: 0.4,
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }

  throw new Error(`不支持的 AI 提供商: ${provider}`);
}
