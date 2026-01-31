import Anthropic from '@anthropic-ai/sdk';
import type { AnalysisResult } from '../types';
import { DATA_ANALYST_SYSTEM_PROMPT, buildAnalysisPrompt } from './prompt';
import { dataToCSVString, getDataSummary, type ParsedData } from '../excel-parser';

// 延迟初始化，避免构建时报错
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export async function analyzeWithAnthropic(
  data: ParsedData,
  customPrompt?: string
): Promise<AnalysisResult> {
  const csvString = dataToCSVString(data.rows);
  const dataSummary = getDataSummary(data);
  const userPrompt = buildAnalysisPrompt(dataSummary, csvString, customPrompt);

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: DATA_ANALYST_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Anthropic 返回内容不是文本');
  }

  try {
    // Claude 可能会在 JSON 前后添加一些文本，需要提取 JSON 部分
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从响应中提取 JSON');
    }
    
    const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
    return validateAnalysisResult(result);
  } catch (error) {
    throw new Error(`解析 Anthropic 响应失败: ${error}`);
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
