import OpenAI from 'openai';
import type { AnalysisResult } from '../types';
import { DATA_ANALYST_SYSTEM_PROMPT, buildAnalysisPrompt } from './prompt';
import { dataToCSVString, getDataSummary, type ParsedData } from '../excel-parser';

// 延迟初始化，避免构建时报错
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function analyzeWithOpenAI(
  data: ParsedData,
  customPrompt?: string
): Promise<AnalysisResult> {
  const csvString = dataToCSVString(data.rows);
  const dataSummary = getDataSummary(data);
  const userPrompt = buildAnalysisPrompt(dataSummary, csvString, customPrompt);

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: DATA_ANALYST_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI 返回内容为空');
  }

  try {
    const result = JSON.parse(content) as AnalysisResult;
    return validateAnalysisResult(result);
  } catch (error) {
    throw new Error(`解析 OpenAI 响应失败: ${error}`);
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
