// 数据分析相关类型定义

export type AIProvider = "openai" | "anthropic" | "openrouter";

export interface MetricItem {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  changePercent?: number;
}

/** 图表类型：line=折线图（趋势/时间序列），bar=柱状图（类别对比/排名） */
export type ChartType = "line" | "bar";

/** 单个报告图表（多图表时使用） */
export interface ReportChart {
  title: string;
  data: ChartDataItem[];
  chartType: ChartType;
}

export interface AnalysisResult {
  summary: string;
  keyMetrics: MetricItem[];
  insights: string[];
  recommendations: string[];
  /** 单图表模式：兼容旧报告 */
  chartData?: ChartDataItem[];
  /** 单图表类型，与 chartData 配套 */
  chartType?: ChartType;
  /** 多图表模式：信息量丰富时可展示多个分析图表，每项含标题、数据、类型 */
  charts?: ReportChart[];
}

export interface ChartDataItem {
  name: string;
  [key: string]: string | number;
}

// 大纲章节类型
export type OutlineSectionType =
  | "summary"
  | "metrics"
  | "chart"
  | "insight"
  | "recommendation";

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
export type CreateMode = "generate" | "paste" | "import";

// 创建向导步骤
export type CreateStep = "mode" | "input" | "outline" | "theme" | "generating";

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

/** 报告元数据（用于编辑时数据 grounded） */
export interface ReportMeta {
  /** 仅可引用的统计清单（10～20 条），编辑时约束 AI 不编造数字 */
  citationList?: string[];
  /** 质量检查警告（如无记录表述等），不阻断生成，供人工复检 */
  qualityWarnings?: string[];
}

/** 服务端根据 selectedChartIds 从 suggestedCharts 生成的 ECharts option，按 id 索引供前端渲染 */
export type ReportChartOptions = Record<string, unknown>;

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
  /** 用户原始描述/意图（创建时填写，供展示与按意图重生成） */
  userIdea?: string;
  /** 报告元数据（如引用清单，供编辑章节时注入） */
  meta?: ReportMeta;
  /**
   * 大模型生成的报告正文 HTML。
   * 若存在则前端直接渲染此 HTML（并在占位符处注入图表），不再按 outline + analysis 拆节渲染。
   */
  contentHtml?: string;
  /**
   * 服务端根据 selectedChartIds + suggestedCharts 生成的 ECharts option 列表。
   * key 为 chart id（如 chart_1），value 为 ECharts option；前端用 data-chart-id 取 option 渲染。
   */
  chartOptions?: ReportChartOptions;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  columnTypes: Record<string, "number" | "date" | "string">;
}

export interface AnalyzeRequest {
  data: Record<string, unknown>[];
  provider: AIProvider;
  model?: string; // OpenRouter 模型选择
  title?: string;
}

// ============ 数据分析引擎类型（从 data-analyzer.ts 导出） ============

/** 增强的字段类型 */
export type FieldType = "id" | "date" | "number" | "category" | "text";

/** 字段元信息 */
export interface FieldMeta {
  name: string;
  type: FieldType;
  uniqueCount: number;
  nonNullCount: number;
  totalCount: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: { fileIndex: number; fieldName: string };
}

/** 数值列统计 */
export interface NumericStats {
  min: number;
  max: number;
  sum: number;
  mean: number;
  median: number;
  stdDev: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
}

/** 分类列统计 */
export interface CategoryStats {
  distribution: { value: string; count: number; percent: number }[];
  topN: { value: string; count: number }[];
}

/** 日期列统计 */
export interface DateStats {
  minDate: string;
  maxDate: string;
  spanDays: number;
  isTimeSeries: boolean;
}

/** 单个文件的分析结果 */
export interface FileAnalysis {
  fileIndex: number;
  fileName?: string;
  rowCount: number;
  columnCount: number;
  fields: FieldMeta[];
  numericStats: Record<string, NumericStats>;
  categoryStats: Record<string, CategoryStats>;
  dateStats: Record<string, DateStats>;
}

/** 文件间关联关系 */
export interface Relationship {
  fromFileIndex: number;
  fromField: string;
  toFileIndex: number;
  toField: string;
  matchRate: number;
  relationType: "one-to-one" | "one-to-many" | "many-to-one";
}

/** 跨文件统计 */
export interface CrossFileStat {
  id: string;
  title: string;
  description: string;
  statType: "sum" | "count" | "avg" | "distribution";
  groupBy: string;
  aggregateField: string;
  data: { name: string; value: number; [key: string]: string | number }[];
}

/** 图表候选 */
export interface ChartCandidate {
  id: string;
  title: string;
  chartType: ChartType;
  description: string;
  data: ChartDataItem[];
  relevance: number;
  source: string;
}

/** 完整的数据分析结果 */
export interface DataAnalysis {
  files: FileAnalysis[];
  relationships: Relationship[];
  crossFileStats: CrossFileStat[];
  suggestedCharts: ChartCandidate[];
}
