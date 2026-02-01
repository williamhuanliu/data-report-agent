/**
 * 图表数据生成器
 * 基于数据分析结果生成高质量的图表配置和数据
 */

import type {
  ChartDataItem,
  ChartType,
  ParsedData,
  DataAnalysis,
  ChartCandidate,
  CrossFileStat,
} from './types';

// ============ 类型定义 ============

/** 图表配置 */
export interface ChartConfig {
  chartType: ChartType;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  data: ChartDataItem[];
  /** 数据系列名称列表 */
  series: string[];
}

/** 图表推荐理由 */
export interface ChartRecommendation {
  chart: ChartCandidate;
  reasons: string[];
  alternativeType?: ChartType;
}

// ============ 工具函数 ============

/**
 * 格式化日期为更短的显示格式
 */
function formatDateLabel(dateStr: string): string {
  // 尝试解析日期
  const match = dateStr.match(/(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (match) {
    const [, year, month, day] = match;
    if (day) {
      return `${month}-${day}`;
    }
    return `${year}-${month}`;
  }
  return dateStr;
}

/**
 * 截断过长的标签
 */
function truncateLabel(label: string, maxLength: number = 10): string {
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 2) + '...';
}

// ============ 核心生成函数 ============

/**
 * 生成时间趋势图
 */
export function generateTimeSeriesChart(
  data: ParsedData,
  dateField: string,
  valueFields: string[],
  title?: string
): ChartCandidate | null {
  const grouped: Record<string, Record<string, number>> = {};
  
  for (const row of data.rows) {
    const dateVal = row[dateField];
    if (!dateVal) continue;
    
    // 提取月份
    const dateStr = String(dateVal);
    let key: string;
    
    if (dateStr.includes('T')) {
      // ISO 格式
      key = dateStr.slice(0, 7);
    } else if (dateStr.match(/^\d{4}-\d{2}/)) {
      key = dateStr.slice(0, 7);
    } else {
      key = dateStr;
    }
    
    if (!grouped[key]) {
      grouped[key] = {};
      for (const field of valueFields) {
        grouped[key][field] = 0;
      }
    }
    
    for (const field of valueFields) {
      const val = Number(row[field]) || 0;
      grouped[key][field] += val;
    }
  }
  
  const sortedKeys = Object.keys(grouped).sort();
  if (sortedKeys.length < 2) return null;
  
  const chartData: ChartDataItem[] = sortedKeys.map(key => ({
    name: formatDateLabel(key),
    ...grouped[key],
  }));
  
  return {
    id: `ts_${dateField}_${valueFields[0]}`,
    title: title || `${valueFields[0]}趋势`,
    chartType: 'line',
    description: `展示${valueFields.join('、')}随时间的变化趋势`,
    data: chartData,
    relevance: 90,
    source: `按${dateField}聚合`,
  };
}

/**
 * 生成类别对比图
 */
export function generateCategoryChart(
  data: ParsedData,
  categoryField: string,
  valueField: string,
  aggregation: 'sum' | 'count' | 'avg' = 'sum',
  topN: number = 10,
  title?: string
): ChartCandidate | null {
  const grouped: Record<string, { sum: number; count: number }> = {};
  
  for (const row of data.rows) {
    const category = String(row[categoryField] || '');
    if (!category) continue;
    
    if (!grouped[category]) {
      grouped[category] = { sum: 0, count: 0 };
    }
    
    const val = Number(row[valueField]) || 0;
    grouped[category].sum += val;
    grouped[category].count += 1;
  }
  
  const entries = Object.entries(grouped);
  if (entries.length < 2) return null;
  
  const sortedData = entries
    .map(([name, { sum, count }]) => ({
      name: truncateLabel(name),
      [valueField]: aggregation === 'sum' ? sum : aggregation === 'count' ? count : sum / count,
    }))
    .sort((a, b) => (b[valueField] as number) - (a[valueField] as number))
    .slice(0, topN);
  
  const aggLabel = aggregation === 'sum' ? '总计' : aggregation === 'count' ? '数量' : '平均';
  
  return {
    id: `cat_${categoryField}_${valueField}`,
    title: title || `各${categoryField}${valueField}${aggLabel}`,
    chartType: 'bar',
    description: `按${categoryField}分组统计${valueField}的${aggLabel}`,
    data: sortedData,
    relevance: 80,
    source: `按${categoryField}分组`,
  };
}

/**
 * 生成跨文件关联图表
 */
export function generateCrossFileChart(stat: CrossFileStat): ChartCandidate {
  const chartData = stat.data.slice(0, 12).map(d => ({
    name: truncateLabel(d.name),
    [stat.aggregateField]: d.value,
  }));
  
  return {
    id: stat.id,
    title: stat.title,
    chartType: 'bar',
    description: stat.description,
    data: chartData,
    relevance: 95,
    source: stat.description,
  };
}

/**
 * 为分析结果选择最佳图表并给出推荐理由
 */
export function recommendChart(analysis: DataAnalysis): ChartRecommendation | null {
  const charts = analysis.suggestedCharts;
  if (charts.length === 0) return null;
  
  const best = charts[0];
  const reasons: string[] = [];
  
  // 分析推荐理由
  if (best.chartType === 'line') {
    reasons.push('数据呈现时间序列特征，折线图能更好地展示趋势变化');
  } else {
    reasons.push('数据为类别对比型，柱状图能直观对比各项差异');
  }
  
  if (analysis.relationships.length > 0 && best.source.includes('跨文件')) {
    reasons.push('该图表展示了多个数据源的关联分析结果');
  }
  
  if (best.data.length >= 5) {
    reasons.push(`包含 ${best.data.length} 个数据点，信息量充足`);
  }
  
  // 建议备选类型
  let alternativeType: ChartType | undefined;
  if (best.chartType === 'bar' && best.data.length > 8) {
    alternativeType = 'line';
  } else if (best.chartType === 'line' && best.data.length <= 5) {
    alternativeType = 'bar';
  }
  
  return {
    chart: best,
    reasons,
    alternativeType,
  };
}

/**
 * 生成完整的图表配置
 */
export function generateChartConfig(chart: ChartCandidate): ChartConfig {
  // 提取数据系列名称
  const sampleRow = chart.data[0];
  const series = sampleRow 
    ? Object.keys(sampleRow).filter(k => k !== 'name')
    : [];
  
  return {
    chartType: chart.chartType,
    title: chart.title,
    xAxisLabel: chart.chartType === 'line' ? '时间' : '类别',
    yAxisLabel: series[0] || '数值',
    data: chart.data,
    series,
  };
}

/**
 * 从分析结果中自动生成所有合理的图表
 */
export function generateAllCharts(
  analysis: DataAnalysis,
  dataList: ParsedData[]
): ChartCandidate[] {
  const charts: ChartCandidate[] = [];
  
  // 1. 基于文件内的时间序列和类别生成图表
  for (let i = 0; i < analysis.files.length; i++) {
    const file = analysis.files[i];
    const data = dataList[i];
    
    // 时间序列图表
    const dateField = file.fields.find(f => f.type === 'date');
    const numericFields = file.fields.filter(f => f.type === 'number');
    
    if (dateField && numericFields.length > 0) {
      const tsChart = generateTimeSeriesChart(
        data,
        dateField.name,
        numericFields.slice(0, 3).map(f => f.name),
        `${file.fileName || `文件${i + 1}`} - ${numericFields[0].name}趋势`
      );
      if (tsChart) {
        charts.push(tsChart);
      }
    }
    
    // 类别对比图表
    const categoryField = file.fields.find(f => f.type === 'category');
    if (categoryField && numericFields.length > 0) {
      const catChart = generateCategoryChart(
        data,
        categoryField.name,
        numericFields[0].name,
        'sum',
        10,
        `${file.fileName || `文件${i + 1}`} - 各${categoryField.name}${numericFields[0].name}`
      );
      if (catChart) {
        charts.push(catChart);
      }
    }
  }
  
  // 2. 跨文件统计图表
  for (const stat of analysis.crossFileStats) {
    charts.push(generateCrossFileChart(stat));
  }
  
  // 3. 按相关性排序
  charts.sort((a, b) => b.relevance - a.relevance);
  
  return charts;
}

/**
 * 智能选择最适合的单个图表
 * 优先选择：1. 跨文件关联 2. 时间趋势 3. 类别对比
 */
export function selectOptimalChart(
  analysis: DataAnalysis,
  preferredType?: ChartType
): ChartCandidate | null {
  const charts = analysis.suggestedCharts;
  if (charts.length === 0) return null;
  
  // 如果有偏好类型，优先匹配
  if (preferredType) {
    const preferred = charts.find(c => c.chartType === preferredType);
    if (preferred) return preferred;
  }
  
  // 优先返回跨文件分析图表
  const crossFileChart = charts.find(c => c.id.startsWith('cross_') || c.relevance >= 95);
  if (crossFileChart) return crossFileChart;
  
  // 其次返回时间序列图表
  const tsChart = charts.find(c => c.chartType === 'line' && c.relevance >= 85);
  if (tsChart) return tsChart;
  
  // 默认返回第一个（已按相关性排序）
  return charts[0];
}
