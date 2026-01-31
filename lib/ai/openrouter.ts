import OpenAI from 'openai';
import type { AnalysisResult } from '../types';
import { DATA_ANALYST_SYSTEM_PROMPT, buildAnalysisPrompt, IDEA_REPORT_SYSTEM_PROMPT, buildIdeaPrompt } from './prompt';
import { dataToCSVString, getDataSummary, type ParsedData } from '../excel-parser';

// 延迟初始化，避免构建时报错
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

/** 默认使用便宜的大模型（可被 OPENROUTER_DEFAULT_MODEL 覆盖） */
export const DEFAULT_OPENROUTER_MODEL_ID = 'google/gemini-2.0-flash-001';

export function getDefaultOpenRouterModel(): string {
  return process.env.OPENROUTER_DEFAULT_MODEL || DEFAULT_OPENROUTER_MODEL_ID;
}

// OpenRouter 支持的常用模型（便宜优先）
export const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash（默认）' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
] as const;

export type OpenRouterModel = typeof OPENROUTER_MODELS[number]['id'];

export async function analyzeWithOpenRouter(
  data: ParsedData,
  model: string = getDefaultOpenRouterModel(),
  customPrompt?: string
): Promise<AnalysisResult> {
  const csvString = dataToCSVString(data.rows);
  const dataSummary = getDataSummary(data);
  const userPrompt = buildAnalysisPrompt(dataSummary, csvString, customPrompt);

  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: DATA_ANALYST_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter 返回内容为空');
  }

  try {
    // 尝试提取 JSON 部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从响应中提取 JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
    return validateAnalysisResult(result);
  } catch (error) {
    throw new Error(`解析 OpenRouter 响应失败: ${error}`);
  }
}

/** 仅从想法描述生成报告结构（无数据） */
export async function analyzeFromIdeaWithOpenRouter(
  idea: string,
  model: string = getDefaultOpenRouterModel()
): Promise<AnalysisResult> {
  const userPrompt = buildIdeaPrompt(idea);

  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: IDEA_REPORT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter 返回内容为空');
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从响应中提取 JSON');
    }
    const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
    return validateAnalysisResult(result);
  } catch (error) {
    throw new Error(`解析 OpenRouter 响应失败: ${error}`);
  }
}

function validateAnalysisResult(result: unknown): AnalysisResult {
  const r = result as AnalysisResult;
  
  if (!r.summary || typeof r.summary !== 'string') {
    throw new Error('缺少 summary 字段');
  }
  
  if (!Array.isArray(r.keyMetrics)) {
    r.keyMetrics = [];
  }
  
  if (!Array.isArray(r.insights)) {
    r.insights = [];
  }
  
  if (!Array.isArray(r.recommendations)) {
    r.recommendations = [];
  }
  
  return r;
}
