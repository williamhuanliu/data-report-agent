// 数据分析相关类型定义

export type AIProvider = 'openai' | 'anthropic' | 'openrouter';

export interface MetricItem {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export interface AnalysisResult {
  summary: string;
  keyMetrics: MetricItem[];
  insights: string[];
  recommendations: string[];
  chartData?: ChartDataItem[];
}

export interface ChartDataItem {
  name: string;
  [key: string]: string | number;
}

// 大纲章节类型
export type OutlineSectionType = 'summary' | 'metrics' | 'chart' | 'insight' | 'recommendation';

export interface OutlineSection {
  id: string;
  type: OutlineSectionType;
  title: string;
  description: string;
  enabled: boolean;
}

export interface ReportOutline {
  title: string;
  sections: OutlineSection[];
}

// 创建模式
export type CreateMode = 'generate' | 'paste' | 'import';

// 创建向导步骤
export type CreateStep = 'mode' | 'input' | 'outline' | 'theme' | 'generating';

// 创建向导状态
export interface CreateWizardState {
  mode: CreateMode | null;
  step: CreateStep;
  idea: string;
  pastedContent: string;
  parsedData: ParsedData | null;
  fileName: string;
  outline: ReportOutline | null;
  theme: string;
  title: string;
}

export interface Report {
  id: string;
  title: string;
  createdAt: string;
  rawData: Record<string, unknown>[];
  analysis: AnalysisResult;
  aiProvider: AIProvider;
  openrouterModel?: string;
  theme?: string;
  outline?: ReportOutline;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  columnTypes: Record<string, 'number' | 'date' | 'string'>;
}

export interface AnalyzeRequest {
  data: Record<string, unknown>[];
  provider: AIProvider;
  model?: string; // OpenRouter 模型选择
  title?: string;
}
