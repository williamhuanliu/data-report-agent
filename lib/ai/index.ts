import type { AIProvider, AnalysisResult } from '../types';
import type { ParsedData } from '../excel-parser';
import { analyzeWithOpenAI } from './openai';
import { analyzeWithAnthropic } from './anthropic';
import { analyzeWithOpenRouter, analyzeFromIdeaWithOpenRouter, OPENROUTER_MODELS } from './openrouter';

export { OPENROUTER_MODELS };

export async function analyzeData(
  data: ParsedData,
  provider: AIProvider,
  options?: {
    model?: string;
    customPrompt?: string;
  }
): Promise<AnalysisResult> {
  const { model, customPrompt } = options || {};

  switch (provider) {
    case 'openai':
      return analyzeWithOpenAI(data, customPrompt);
    
    case 'anthropic':
      return analyzeWithAnthropic(data, customPrompt);
    
    case 'openrouter':
      return analyzeWithOpenRouter(data, model, customPrompt);
    
    default:
      throw new Error(`不支持的 AI 提供商: ${provider}`);
  }
}

/** 仅从想法描述生成报告（无数据），当前仅支持 OpenRouter */
export async function analyzeFromIdea(
  idea: string,
  provider: AIProvider,
  options?: { model?: string }
): Promise<AnalysisResult> {
  if (provider !== 'openrouter') {
    throw new Error('仅描述生成当前仅支持 OpenRouter');
  }
  return analyzeFromIdeaWithOpenRouter(idea, options?.model);
}
