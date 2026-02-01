/**
 * 数据分析引擎
 * 负责服务端数据预处理：字段类型识别、多文件关联检测、深度统计计算
 */

import type {
  ParsedData,
  ChartDataItem,
  FieldType,
  FieldMeta,
  NumericStats,
  CategoryStats,
  DateStats,
  FileAnalysis,
  Relationship,
  CrossFileStat,
  ChartCandidate,
  DataAnalysis,
} from './types';

// 重新导出类型，方便其他模块使用
export type {
  FieldType,
  FieldMeta,
  NumericStats,
  CategoryStats,
  DateStats,
  FileAnalysis,
  Relationship,
  CrossFileStat,
  ChartCandidate,
  DataAnalysis,
};

// ============ 数据分析领域知识常量 ============

/** 
 * 图表类型选择规则（数据分析最佳实践）
 * - 折线图(line)：必须有时间维度，用于展示趋势变化
 * - 柱状图(bar)：用于类别对比、排名、分布
 * - 禁止：用非时间维度做折线图
 */
const CHART_TYPE_RULES = {
  /** 折线图必须满足的条件 */
  LINE_CHART_REQUIRES: {
    hasDateField: true,        // 必须有日期/时间字段
    minDataPoints: 3,          // 至少3个时间点
    isTimeSeries: true,        // 数据是时间序列
  },
  /** 柱状图适用场景 */
  BAR_CHART_SUITABLE: {
    categoryComparison: true,  // 类别对比
    ranking: true,             // 排名展示
    distribution: true,        // 分布统计
    maxCategories: 15,         // 最多15个类别
  },
};

/** 
 * 时间粒度识别规则（在 detectTimeGranularity 中使用）
 * 根据时间跨度自动选择合适的聚合粒度
 */
// 规则已内置到 detectTimeGranularity 函数中：
// - 日粒度：平均间隔 ≤ 2 天
// - 周粒度：平均间隔 ≤ 10 天  
// - 月粒度：平均间隔 ≤ 45 天
// - 季度粒度：平均间隔 ≤ 120 天
// - 年粒度：其他情况

/** 
 * 指标类型分类规则
 * 不同类型的指标需要不同的聚合方式
 */
const METRIC_CLASSIFICATION = {
  /** 可累加型指标（SUM）：播放量、收入、点击数等绝对数值 */
  SUMMABLE_PATTERNS: [
    '播放', '点击', '收入', '金额', '销量', '数量', '次数', '访问', '阅读', '下载',
    'count', 'amount', 'revenue', 'sales', 'clicks', 'views', 'downloads',
  ],
  /** 排名型指标（不可 SUM） */
  RANKING_PATTERNS: [
    '排名', '名次', '位次', 'rank', 'position',
  ],
  /** 年份/时间点型（不可 SUM）：出道年份、成立年份等求和无意义 */
  YEAR_PATTERNS: [
    '年份', // 出道年份、成立年份、发行年份
    'year', // 仅英文 year 作独立词（如 debut year）
  ],
  /** 比率型指标（不可直接SUM） */
  RATIO_PATTERNS: [
    '率', '比例', '占比', 'rate', 'ratio', 'percentage', '%',
  ],
  /** 平均值型指标（AVG）：评分、时长等 */
  AVERAGE_PATTERNS: [
    '评分', '时长', '分数', '秒', '分钟', 'score', 'rating', 'duration', 'average', 'avg',
  ],
};

/**
 * 判断数值字段的聚合类型
 */
function getAggregationType(fieldName: string): 'sum' | 'avg' | 'none' {
  const lowerName = fieldName.toLowerCase();
  
  if (METRIC_CLASSIFICATION.RANKING_PATTERNS.some(p => lowerName.includes(p.toLowerCase()))) {
    return 'none';
  }
  
  // 年份类：绝不能求和（出道年份之和、成立年份之和等无业务含义）
  if (METRIC_CLASSIFICATION.YEAR_PATTERNS.some(p => lowerName.includes(p.toLowerCase()))) {
    return 'none';
  }
  
  if (METRIC_CLASSIFICATION.RATIO_PATTERNS.some(p => lowerName.includes(p.toLowerCase()))) {
    return 'avg';
  }
  
  if (METRIC_CLASSIFICATION.AVERAGE_PATTERNS.some(p => lowerName.includes(p.toLowerCase()))) {
    return 'avg';
  }
  
  return 'sum';
}

/** 
 * 业务指标计算规则
 */
const BUSINESS_METRICS = {
  /** 增长率阈值 */
  GROWTH_THRESHOLDS: {
    significant: 10,   // 显著增长 > 10%
    moderate: 5,       // 中等增长 5-10%
    stable: 5,         // 稳定 -5% ~ 5%
  },
  /** 集中度指标 */
  CONCENTRATION: {
    high: 0.8,         // 头部占比 > 80% 为高集中度
    medium: 0.6,       // 60-80% 为中等集中度
  },
};

// ============ 工具函数 ============

/** 判断是否为 ID 列 */
function isIdField(name: string, values: unknown[], totalCount: number): boolean {
  const lowerName = name.toLowerCase();
  // 名称包含 id 或 编号
  const nameHint = lowerName.includes('id') || lowerName.includes('编号') || lowerName.includes('编码');
  
  // 检查唯一性：如果唯一值接近总行数，可能是 ID
  const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined));
  const uniqueRatio = uniqueValues.size / totalCount;
  
  return nameHint || uniqueRatio > 0.95;
}

/** 判断是否为分类列（重复率高的文本列） */
function isCategoryField(values: unknown[], type: string, _totalCount: number): boolean {
  if (type !== 'string') return false;
  
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return false;
  
  const uniqueValues = new Set(nonNullValues.map(String));
  const uniqueRatio = uniqueValues.size / nonNullValues.length;
  
  // 唯一值占比低于 30% 且唯一值数量小于 50，认为是分类列
  return uniqueRatio < 0.3 && uniqueValues.size < 50;
}

/** 计算中位数 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 计算标准差 */
function calculateStdDev(numbers: number[], mean: number): number {
  if (numbers.length === 0) return 0;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length);
}

/** 计算趋势 */
function calculateTrend(numbers: number[]): { trend: 'up' | 'down' | 'stable'; percent: number } {
  if (numbers.length < 4) {
    return { trend: 'stable', percent: 0 };
  }
  
  const mid = Math.floor(numbers.length / 2);
  const firstHalf = numbers.slice(0, mid);
  const secondHalf = numbers.slice(mid);
  
  const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  if (firstMean === 0) {
    return { trend: secondMean > 0 ? 'up' : 'stable', percent: 0 };
  }
  
  const changePercent = ((secondMean - firstMean) / Math.abs(firstMean)) * 100;
  
  if (changePercent > 5) {
    return { trend: 'up', percent: Math.round(changePercent) };
  } else if (changePercent < -5) {
    return { trend: 'down', percent: Math.round(Math.abs(changePercent)) };
  }
  return { trend: 'stable', percent: 0 };
}

/** 格式化数值（带单位） */
function formatNumber(n: number): string {
  if (Math.abs(n) >= 100000000) {
    return (n / 100000000).toFixed(2) + '亿';
  }
  if (Math.abs(n) >= 10000) {
    return (n / 10000).toFixed(2) + '万';
  }
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return n.toFixed(2);
}

/** 
 * 计算环比增长率 (MoM - Month over Month)
 * 对比相邻两个时间点的变化
 * @remarks 可供未来高级分析使用
 */
function _calculateMoM(values: { date: string; value: number }[]): number | null {
  if (values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted[sorted.length - 1].value;
  const previous = sorted[sorted.length - 2].value;
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * 计算同比增长率 (YoY - Year over Year)
 * 对比去年同期数据
 * @remarks 可供未来高级分析使用
 */
function _calculateYoY(values: { date: string; value: number }[]): number | null {
  if (values.length < 12) return null;
  const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted[sorted.length - 1].value;
  // 查找12个月前的数据
  const yearAgoIndex = sorted.length - 13;
  if (yearAgoIndex < 0) return null;
  const yearAgo = sorted[yearAgoIndex].value;
  if (yearAgo === 0) return null;
  return ((current - yearAgo) / Math.abs(yearAgo)) * 100;
}

/**
 * 计算百分位数
 */
function calculatePercentile(numbers: number[], percentile: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * 检测异常值（使用 IQR 方法）
 * @remarks 可供未来高级分析使用
 */
function _detectOutliers(numbers: number[]): { outliers: number[]; bounds: { lower: number; upper: number } } {
  if (numbers.length < 4) return { outliers: [], bounds: { lower: 0, upper: 0 } };
  
  const q1 = calculatePercentile(numbers, 25);
  const q3 = calculatePercentile(numbers, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const outliers = numbers.filter(n => n < lowerBound || n > upperBound);
  return { outliers, bounds: { lower: lowerBound, upper: upperBound } };
}

/**
 * 计算集中度（Top N 占总体的比例）
 */
function calculateConcentration(values: number[], topN: number = 3): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  const topSum = sorted.slice(0, topN).reduce((a, b) => a + b, 0);
  const totalSum = sorted.reduce((a, b) => a + b, 0);
  if (totalSum === 0) return 0;
  return topSum / totalSum;
}

/**
 * 判断时间序列的粒度
 */
function detectTimeGranularity(dates: Date[]): 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  if (dates.length < 2) return 'monthly';
  
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const spanDays = Math.ceil((sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / (1000 * 60 * 60 * 24));
  
  // 计算平均间隔
  const avgInterval = spanDays / (dates.length - 1);
  
  if (avgInterval <= 2) return 'daily';
  if (avgInterval <= 10) return 'weekly';
  if (avgInterval <= 45) return 'monthly';
  if (avgInterval <= 120) return 'quarterly';
  return 'yearly';
}

/**
 * 根据时间键格式化为可读标签
 * @param timeKey 时间聚合键（来自 getTimeAggregationKey 的输出）
 * @param granularity 时间粒度
 */
function formatTimeKeyToLabel(timeKey: string, granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  switch (granularity) {
    case 'daily':
      // 输入: 2024-01-15 → 输出: 01-15
      const dailyMatch = timeKey.match(/\d{4}-(\d{2})-(\d{2})/);
      if (dailyMatch) return `${dailyMatch[1]}-${dailyMatch[2]}`;
      return timeKey;
    case 'weekly':
      // 输入: 2024-W05 → 输出: 24年W5
      const weeklyMatch = timeKey.match(/(\d{4})-W(\d{2})/);
      if (weeklyMatch) return `${weeklyMatch[1].slice(2)}年W${parseInt(weeklyMatch[2])}`;
      return timeKey;
    case 'monthly':
      // 输入: 2024-01 → 输出: 24年1月
      const monthlyMatch = timeKey.match(/(\d{4})-(\d{2})/);
      if (monthlyMatch) return `${monthlyMatch[1].slice(2)}年${parseInt(monthlyMatch[2])}月`;
      return timeKey;
    case 'quarterly':
      // 输入: 2024-Q1 → 输出: 24年Q1
      const quarterlyMatch = timeKey.match(/(\d{4})-Q(\d)/);
      if (quarterlyMatch) return `${quarterlyMatch[1].slice(2)}年Q${quarterlyMatch[2]}`;
      return timeKey;
    case 'yearly':
      // 输入: 2024 → 输出: 2024年
      return `${timeKey}年`;
    default:
      return timeKey;
  }
}

/**
 * 生成时间聚合键（用于分组）
 */
function getTimeAggregationKey(date: Date | string, granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  switch (granularity) {
    case 'daily':
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'weekly':
      // ISO 周
      const jan1 = new Date(year, 0, 1);
      const days = Math.floor((d.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
      return `${year}-W${String(weekNum).padStart(2, '0')}`;
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'quarterly':
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    case 'yearly':
      return `${year}`;
    default:
      return `${year}-${String(month).padStart(2, '0')}`;
  }
}

// ============ 核心分析函数 ============

/** 分析单个文件 */
function analyzeFile(data: ParsedData, fileIndex: number, fileName?: string): FileAnalysis {
  const { headers, rows, columnTypes } = data;
  const fields: FieldMeta[] = [];
  const numericStats: Record<string, NumericStats> = {};
  const categoryStats: Record<string, CategoryStats> = {};
  const dateStats: Record<string, DateStats> = {};
  
  for (const header of headers) {
    const values = rows.map(r => r[header]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));
    const originalType = columnTypes[header];
    
    // 增强的类型识别
    let fieldType: FieldType;
    if (isIdField(header, values, rows.length)) {
      fieldType = 'id';
    } else if (originalType === 'date') {
      fieldType = 'date';
    } else if (originalType === 'number') {
      fieldType = 'number';
    } else if (isCategoryField(values, originalType, rows.length)) {
      fieldType = 'category';
    } else {
      fieldType = 'text';
    }
    
    const fieldMeta: FieldMeta = {
      name: header,
      type: fieldType,
      uniqueCount: uniqueValues.size,
      nonNullCount: nonNullValues.length,
      totalCount: rows.length,
      isPrimaryKey: fieldType === 'id' && uniqueValues.size === rows.length,
      isForeignKey: false, // 稍后在关联检测中设置
    };
    fields.push(fieldMeta);
    
    // 数值列统计
    if (fieldType === 'number') {
      const numbers = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / numbers.length;
        const { trend, percent } = calculateTrend(numbers);
        
        numericStats[header] = {
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          sum,
          mean,
          median: calculateMedian(numbers),
          stdDev: calculateStdDev(numbers, mean),
          trend,
          trendPercent: percent,
        };
      }
    }
    
    // 分类列统计
    if (fieldType === 'category') {
      const counts: Record<string, number> = {};
      for (const v of nonNullValues) {
        const key = String(v);
        counts[key] = (counts[key] || 0) + 1;
      }
      
      const distribution = Object.entries(counts)
        .map(([value, count]) => ({
          value,
          count,
          percent: Math.round((count / nonNullValues.length) * 100),
        }))
        .sort((a, b) => b.count - a.count);
      
      categoryStats[header] = {
        distribution,
        topN: distribution.slice(0, 10),
      };
    }
    
    // 日期列统计
    if (fieldType === 'date') {
      const dates = nonNullValues
        .map(v => new Date(String(v)))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (dates.length > 0) {
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        const spanDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 判断是否为时间序列：日期分布相对均匀
        const isTimeSeries = dates.length > 3 && spanDays / dates.length < 100;
        
        dateStats[header] = {
          minDate: minDate.toISOString().split('T')[0],
          maxDate: maxDate.toISOString().split('T')[0],
          spanDays,
          isTimeSeries,
        };
      }
    }
  }
  
  return {
    fileIndex,
    fileName,
    rowCount: rows.length,
    columnCount: headers.length,
    fields,
    numericStats,
    categoryStats,
    dateStats,
  };
}

/** 检测多文件关联关系 */
function detectRelationships(
  files: FileAnalysis[],
  dataList: ParsedData[]
): Relationship[] {
  const relationships: Relationship[] = [];
  
  // 遍历所有文件对
  for (let i = 0; i < files.length; i++) {
    for (let j = 0; j < files.length; j++) {
      if (i === j) continue;
      
      const fileA = files[i];
      const fileB = files[j];
      const dataA = dataList[i];
      const dataB = dataList[j];
      
      // 检查 fileA 中的 ID 类型字段是否能关联到 fileB
      for (const fieldA of fileA.fields) {
        if (fieldA.type !== 'id') continue;
        
        for (const fieldB of fileB.fields) {
          if (fieldB.type !== 'id') continue;
          
          // 检查字段名是否匹配
          const nameA = fieldA.name.toLowerCase();
          const nameB = fieldB.name.toLowerCase();
          
          // 字段名相同，或者 A 的字段名包含 B 的字段名（如 "歌手ID" 包含 "ID"）
          const nameMatch = nameA === nameB || 
            nameA.includes(nameB.replace('id', '')) ||
            nameB.includes(nameA.replace('id', ''));
          
          if (!nameMatch) continue;
          
          // 计算匹配率
          const valuesA = new Set(dataA.rows.map(r => String(r[fieldA.name])));
          const valuesB = new Set(dataB.rows.map(r => String(r[fieldB.name])));
          
          let matchCount = 0;
          for (const v of valuesA) {
            if (valuesB.has(v)) matchCount++;
          }
          
          const matchRate = matchCount / valuesA.size;
          
          // 匹配率超过 50% 认为是有效关联
          if (matchRate >= 0.5) {
            // 判断关系类型
            const aIsPrimary = fieldA.isPrimaryKey;
            const bIsPrimary = fieldB.isPrimaryKey;
            
            let relationType: Relationship['relationType'];
            if (aIsPrimary && bIsPrimary) {
              relationType = 'one-to-one';
            } else if (bIsPrimary) {
              relationType = 'many-to-one';
            } else {
              relationType = 'one-to-many';
            }
            
            relationships.push({
              fromFileIndex: i,
              fromField: fieldA.name,
              toFileIndex: j,
              toField: fieldB.name,
              matchRate: Math.round(matchRate * 100) / 100,
              relationType,
            });
            
            // 标记外键
            fieldA.isForeignKey = true;
            fieldA.foreignKeyRef = { fileIndex: j, fieldName: fieldB.name };
          }
        }
      }
    }
  }
  
  return relationships;
}

/** 文件名转可读维度名（去掉扩展名，便于报告标题） */
function fileDisplayName(fileName: string | undefined, fallback: string): string {
  if (!fileName) return fallback;
  return fileName.replace(/\.(csv|xlsx?)$/i, '').trim() || fallback;
}

/** 生成跨文件统计 */
function generateCrossFileStats(
  files: FileAnalysis[],
  dataList: ParsedData[],
  relationships: Relationship[]
): CrossFileStat[] {
  const stats: CrossFileStat[] = [];
  
  for (const rel of relationships) {
    const fromData = dataList[rel.fromFileIndex];
    const toData = dataList[rel.toFileIndex];
    const fromFile = files[rel.fromFileIndex];
    const toFile = files[rel.toFileIndex];
    
    const toLabel = fileDisplayName(toFile.fileName, `维度${rel.toFileIndex + 1}`);
    const fromLabel = fileDisplayName(fromFile.fileName, `数据源${rel.fromFileIndex + 1}`);
    
    const numericFields = fromFile.fields.filter(f => 
      f.type === 'number' && getAggregationType(f.name) === 'sum'
    );
    
    for (const numField of numericFields) {
      const refMap = new Map<string, Record<string, unknown>>();
      for (const row of toData.rows) {
        const key = String(row[rel.toField]);
        refMap.set(key, row);
      }
      
      const groupedSum: Record<string, number> = {};
      const groupedCount: Record<string, number> = {};
      
      for (const row of fromData.rows) {
        const fkValue = String(row[rel.fromField]);
        const refRow = refMap.get(fkValue);
        
        if (refRow) {
          let groupName = fkValue;
          const nameField = toFile.fields.find(f => 
            f.name.includes('名') || f.name.includes('name') || f.type === 'text'
          );
          if (nameField) {
            groupName = String(refRow[nameField.name]) || fkValue;
          }
          
          const value = Number(row[numField.name]) || 0;
          groupedSum[groupName] = (groupedSum[groupName] || 0) + value;
          groupedCount[groupName] = (groupedCount[groupName] || 0) + 1;
        }
      }
      
      const sumData = Object.entries(groupedSum)
        .map(([name, value]) => ({ name, value, count: groupedCount[name] || 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
      
      if (sumData.length > 0) {
        stats.push({
          id: `cross_${rel.fromFileIndex}_${rel.toFileIndex}_${numField.name}`,
          title: `按${toLabel}统计${numField.name}`,
          description: `将${fromLabel}中的${numField.name}按${toLabel}（${rel.toField}）分组汇总`,
          statType: 'sum',
          groupBy: rel.toField,
          aggregateField: numField.name,
          data: sumData,
        });
      }
    }
  }
  
  return stats;
}

/**
 * 智能解析日期字符串，支持多种格式
 */
function parseDate(dateVal: unknown): Date | null {
  if (!dateVal) return null;
  
  const dateStr = String(dateVal).trim();
  
  // 尝试标准解析
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // 支持 "2024-01" 格式 (YYYY-MM)
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    d = new Date(dateStr + '-01');
    if (!isNaN(d.getTime())) return d;
  }
  
  // 支持 "2024/01" 格式
  if (/^\d{4}\/\d{2}$/.test(dateStr)) {
    d = new Date(dateStr.replace('/', '-') + '-01');
    if (!isNaN(d.getTime())) return d;
  }
  
  // 支持 "202401" 格式 (YYYYMM)
  if (/^\d{6}$/.test(dateStr)) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    d = new Date(`${year}-${month}-01`);
    if (!isNaN(d.getTime())) return d;
  }
  
  // 支持中文格式 "2024年1月"
  const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月/);
  if (cnMatch) {
    d = new Date(`${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-01`);
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
}

/**
 * 检测字段是否为日期型（增强版）
 */
function isDateLikeField(header: string, values: unknown[]): boolean {
  const lowerName = header.toLowerCase();
  // 名称暗示
  if (lowerName.includes('日期') || lowerName.includes('date') || 
      lowerName.includes('时间') || lowerName.includes('time') ||
      lowerName.includes('月份') || lowerName.includes('年份')) {
    return true;
  }
  
  // 检查值是否可解析为日期
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return false;
  
  const dateParseableCount = nonNullValues.filter(v => parseDate(v) !== null).length;
  return dateParseableCount / nonNullValues.length > 0.8;
}

/**
 * 计算增长率
 */
function calculateGrowthRate(values: number[]): { 
  overall: number | null;
  periods: { period: string; rate: number }[];
} {
  if (values.length < 2) return { overall: null, periods: [] };
  
  const first = values[0];
  const last = values[values.length - 1];
  const overall = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;
  
  const periods: { period: string; rate: number }[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    if (prev !== 0) {
      periods.push({
        period: `第${i}期`,
        rate: ((values[i] - prev) / Math.abs(prev)) * 100,
      });
    }
  }
  
  return { overall, periods };
}

/**
 * 主指标优先级：名称含这些词的数值字段优先用于趋势/柱状图（最能表达业务场景）
 */
const PRIMARY_METRIC_HINTS = ['播放', '播放量', '收入', '销量', '点击', 'views', 'clicks', 'revenue', 'sales'];

function sortByPrimaryMetric<T extends { name: string }>(fields: T[]): T[] {
  return [...fields].sort((a, b) => {
    const scoreA = PRIMARY_METRIC_HINTS.some((h) => a.name.includes(h)) ? 0 : 1;
    const scoreB = PRIMARY_METRIC_HINTS.some((h) => b.name.includes(h)) ? 0 : 1;
    return scoreA - scoreB;
  });
}

/** 
 * 生成图表候选
 * 
 * 核心规则（数据分析最佳实践）：
 * 1. 折线图必须有时间维度 - 用于展示趋势、变化、周期
 * 2. 柱状图用于类别对比、排名、分布 - 无时间要求
 * 3. 自动选择最佳时间粒度（日/周/月/季/年）
 * 4. 多系列趋势图：当有分类维度时，展示每个类别的趋势
 * 5. 数值字段按主指标优先排序，候选 description 含「适用场景」供 AI 匹配章节意图
 */
function generateChartCandidates(
  files: FileAnalysis[],
  dataList: ParsedData[],
  crossFileStats: CrossFileStat[]
): ChartCandidate[] {
  const candidates: ChartCandidate[] = [];
  let chartId = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const data = dataList[i];
    
    // 1. 检测日期字段（增强版）
    let dateField = file.fields.find(f => f.type === 'date');
    
    // 如果没有检测到日期字段，用增强方法再检测一次
    if (!dateField) {
      for (const field of file.fields) {
        const values = data.rows.map(r => r[field.name]);
        if (isDateLikeField(field.name, values)) {
          dateField = field;
          break;
        }
      }
    }
    
    const numericFields = file.fields.filter(f => f.type === 'number');
    const idFields = file.fields.filter(f => f.type === 'id' && !f.isPrimaryKey);
    
    // ========== 趋势图生成 ==========
    if (dateField && numericFields.length > 0) {
      // 解析所有日期
      const dateValues: { raw: unknown; parsed: Date }[] = [];
      for (const row of data.rows) {
        const dateVal = row[dateField.name];
        const parsed = parseDate(dateVal);
        if (parsed) {
          dateValues.push({ raw: dateVal, parsed });
        }
      }
      
      if (dateValues.length >= CHART_TYPE_RULES.LINE_CHART_REQUIRES.minDataPoints) {
        // 先用月粒度初步聚合，统计有多少个唯一月份
        const uniqueMonths = new Set(dateValues.map(d => {
          const date = d.parsed;
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }));
        
        // 基于唯一时间点检测粒度（而非所有数据行）
        const uniqueDates = Array.from(uniqueMonths).sort().map(m => new Date(m + '-01'));
        const granularity = detectTimeGranularity(uniqueDates);
        const granularityLabel = {
          daily: '日', weekly: '周', monthly: '月', quarterly: '季度', yearly: '年',
        }[granularity];
        
        // ===== 类型1: 总量趋势图（仅使用可累加指标） =====
        // 过滤出可累加的数值字段，并按主指标优先排序（播放、收入、销量等优先）
        const summableFields = sortByPrimaryMetric(
          numericFields.filter(f => getAggregationType(f.name) === 'sum')
        );
        
        if (summableFields.length > 0) {
          const totalTrendData: Record<string, Record<string, number>> = {};
          const countData: Record<string, number> = {}; // 记录每个时间点的数据条数
          
          for (const row of data.rows) {
            const parsed = parseDate(row[dateField.name]);
            if (!parsed) continue;
            
            const timeKey = getTimeAggregationKey(parsed, granularity);
            if (!totalTrendData[timeKey]) {
              totalTrendData[timeKey] = {};
              countData[timeKey] = 0;
            }
            countData[timeKey]++;
            
            // 只累加可累加的指标
            for (const numField of summableFields.slice(0, 2)) {
              const val = Number(row[numField.name]) || 0;
              totalTrendData[timeKey][numField.name] = (totalTrendData[timeKey][numField.name] || 0) + val;
            }
          }
          
          const totalChartData: ChartDataItem[] = Object.entries(totalTrendData)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([timeKey, values]) => ({
              name: formatTimeKeyToLabel(timeKey, granularity),
              ...values,
            }));
          
          if (totalChartData.length >= 3) {
            // 计算增长率
            const mainMetric = summableFields[0].name;
            const metricValues = totalChartData.map(d => {
              const val = d[mainMetric];
              return typeof val === 'number' ? val : 0;
            });
            const growth = calculateGrowthRate(metricValues);
            
            // 计算环比变化
            const momChanges: string[] = [];
            for (let i = 1; i < metricValues.length && i <= 3; i++) {
              if (metricValues[i - 1] !== 0) {
                const change = ((metricValues[i] - metricValues[i - 1]) / Math.abs(metricValues[i - 1]) * 100).toFixed(1);
                momChanges.push(`${i}→${i + 1}期: ${Number(change) >= 0 ? '+' : ''}${change}%`);
              }
            }
            
            const growthDesc = growth.overall !== null 
              ? `，整体${growth.overall >= 0 ? '增长' : '下降'}${Math.abs(growth.overall).toFixed(1)}%`
              : '';
            
            candidates.push({
              id: `chart_${++chartId}`,
              title: `${mainMetric}${granularityLabel}度趋势`,
              chartType: 'line',
              description: `适用场景：展示整体随时间趋势。展示${mainMetric}按${granularityLabel}的变化趋势${growthDesc}。环比变化：${momChanges.join('，') || '数据不足'}`,
              data: totalChartData,
              relevance: 98, // 总量趋势最高优先级
              source: `来自${file.fileName || `文件${i + 1}`}，按${dateField.name}聚合`,
            });
          }
        }
        
        // ===== 类型2: 多系列趋势图（按 ID 分类，展示个体趋势对比） =====
        if (idFields.length > 0 && summableFields.length > 0) {
          const categoryField = idFields[0]; // 用第一个非主键 ID 字段作为分类
          const mainMetric = summableFields[0].name; // 使用可累加指标
          
          // 按分类分组
          const seriesData: Record<string, Record<string, number>> = {};
          const timeKeys = new Set<string>();
          
          for (const row of data.rows) {
            const parsed = parseDate(row[dateField.name]);
            if (!parsed) continue;
            
            const timeKey = getTimeAggregationKey(parsed, granularity);
            const category = String(row[categoryField.name] || '');
            if (!category) continue;
            
            timeKeys.add(timeKey);
            if (!seriesData[category]) {
              seriesData[category] = {};
            }
            
            const val = Number(row[mainMetric]) || 0;
            seriesData[category][timeKey] = (seriesData[category][timeKey] || 0) + val;
          }
          
          // 计算每个系列的增长率和总量
          const seriesWithGrowth = Object.entries(seriesData)
            .map(([name, data]) => {
              const sortedTimeKeys = Array.from(timeKeys).sort();
              const values = sortedTimeKeys.map(tk => data[tk] || 0);
              const total = values.reduce((a, b) => a + b, 0);
              const growth = calculateGrowthRate(values);
              return {
                name,
                total,
                growthRate: growth.overall,
                data,
              };
            })
            .slice(0, 5); // Top 5 系列
          
          if (seriesWithGrowth.length >= 2) {
            const sortedTimeKeys = Array.from(timeKeys).sort();
            
            const multiSeriesData: ChartDataItem[] = sortedTimeKeys.map(timeKey => {
              const point: ChartDataItem = {
                name: formatTimeKeyToLabel(timeKey, granularity),
              };
              for (const series of seriesWithGrowth) {
                point[series.name] = series.data[timeKey] || 0;
              }
              return point;
            });
            
            if (multiSeriesData.length >= 3) {
              // 生成各系列增长描述
              const growthDescriptions = seriesWithGrowth
                .filter(s => s.growthRate !== null)
                .map(s => `${s.name}: ${s.growthRate! >= 0 ? '+' : ''}${s.growthRate!.toFixed(1)}%`)
                .slice(0, 3)
                .join('，');
              
              candidates.push({
                id: `chart_${++chartId}`,
                title: `各${categoryField.name}${mainMetric}趋势对比`,
                chartType: 'line',
                description: `适用场景：展示各分类随时间趋势对比。展示Top${seriesWithGrowth.length}个${categoryField.name}的${mainMetric}随时间变化趋势。增长情况：${growthDescriptions || '数据不足'}`,
                data: multiSeriesData,
                relevance: 96, // 多系列趋势图高优先级
                source: `来自${file.fileName || `文件${i + 1}`}，按${dateField.name}和${categoryField.name}分组`,
              });
            }
          }
        }
      }
    }
    
    // ========== 柱状图生成 ==========
    // 2. 分类对比图（柱状图）- 无时间维度的类别比较
    const categoryField = file.fields.find(f => f.type === 'category');
    
    // 过滤出可累加的数值字段并按主指标优先排序
    const summableNumericFields = sortByPrimaryMetric(
      numericFields.filter(f => getAggregationType(f.name) === 'sum')
    );
    
    if (categoryField && summableNumericFields.length > 0) {
      const mainMetricForBar = summableNumericFields[0].name;
      const groupedData: Record<string, number> = {};
      
      for (const row of data.rows) {
        const category = String(row[categoryField.name] || '');
        if (!category) continue;
        
        const val = Number(row[mainMetricForBar]) || 0;
        groupedData[category] = (groupedData[category] || 0) + val;
      }
      
      // 计算集中度（业务洞察）
      const values = Object.values(groupedData);
      const concentration = calculateConcentration(values, 3);
      const concentrationNote = concentration > BUSINESS_METRICS.CONCENTRATION.high 
        ? '（高集中度）' 
        : concentration > BUSINESS_METRICS.CONCENTRATION.medium 
          ? '（中等集中度）' 
          : '';
      
      // 计算总量和Top3占比
      const totalValue = values.reduce((a, b) => a + b, 0);
      
      const chartData = Object.entries(groupedData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, CHART_TYPE_RULES.BAR_CHART_SUITABLE.maxCategories)
        .map(([name, value]) => ({ name, [mainMetricForBar]: value }));
      
      if (chartData.length >= 2) {
        const top3Percent = concentration * 100;
        
        candidates.push({
          id: `chart_${++chartId}`,
          title: `各${categoryField.name}${mainMetricForBar}排名${concentrationNote}`,
          chartType: 'bar', // 类别对比 → 柱状图
          description: `适用场景：各${categoryField.name}的排名/集中度对比。按${categoryField.name}分组统计${mainMetricForBar}总量排名，总计${formatNumber(totalValue)}，Top3占比${top3Percent.toFixed(1)}%`,
          data: chartData,
          relevance: 80,
          source: `来自${file.fileName || `文件${i + 1}`}`,
        });
      }
    }
  }
  
  // 3. 跨文件统计 → 柱状图
  for (const stat of crossFileStats) {
    const chartData = stat.data.map(d => ({ 
      name: d.name, 
      [stat.aggregateField]: d.value 
    }));
    
    if (chartData.length >= 2) {
      candidates.push({
        id: `chart_${++chartId}`,
        title: stat.title,
        chartType: 'bar',
        description: `适用场景：跨文件按维度统计对比。${stat.description}`,
        data: chartData,
        relevance: 95, // 跨文件分析更有价值
        source: stat.description,
      });
    }
  }
  
  // 按相关性排序
  candidates.sort((a, b) => b.relevance - a.relevance);
  
  return candidates;
}

// ============ 导出主函数 ============

/**
 * 分析多个数据文件
 * @param dataList 解析后的数据列表
 * @param fileNames 文件名列表（可选）
 */
export function analyzeData(
  dataList: ParsedData[],
  fileNames?: string[]
): DataAnalysis {
  // 1. 分析每个文件
  const files = dataList.map((data, index) => 
    analyzeFile(data, index, fileNames?.[index])
  );
  
  // 2. 检测关联关系
  const relationships = detectRelationships(files, dataList);
  
  // 3. 生成跨文件统计
  const crossFileStats = generateCrossFileStats(files, dataList, relationships);
  
  // 4. 生成图表候选
  const suggestedCharts = generateChartCandidates(files, dataList, crossFileStats);
  
  return {
    files,
    relationships,
    crossFileStats,
    suggestedCharts,
  };
}

/** 将日期字符串格式化为「YYYY年M月」用于报告中的时间范围表述 */
function formatDateRangeLabel(isoDate: string): string {
  const [y, m] = isoDate.split('-');
  const month = m ? parseInt(m, 10) : 0;
  return `${y}年${month}月`;
}

/**
 * 生成「仅可引用的统计清单」（供 prompt 前置使用）
 * 返回 12～22 条简短、可逐条引用的统计句，覆盖趋势、分布、集中度、排名、跨文件、规模/范围等多类信息
 */
export function generateCitationList(analysis: DataAnalysis): string[] {
  const items: string[] = [];

  // 全局数据时间范围（若有任一文件含日期列）：作为报告指标总结的前提，置于清单最前
  let globalMin: string | null = null;
  let globalMax: string | null = null;
  for (const file of analysis.files) {
    for (const stats of Object.values(file.dateStats)) {
      if (!globalMin || stats.minDate < globalMin) globalMin = stats.minDate;
      if (!globalMax || stats.maxDate > globalMax) globalMax = stats.maxDate;
    }
  }
  if (globalMin && globalMax) {
    items.push(`本报告数据时间范围（统计周期）：${formatDateRangeLabel(globalMin)}～${formatDateRangeLabel(globalMax)}。报告中所有对指标的总结、摘要、关键指标与洞察，均须在此时间范围内表述。`);
  }
  
  for (const file of analysis.files) {
    const fileLabel = file.fileName ? file.fileName.replace(/\.(csv|xlsx?)$/i, '') : `文件${file.fileIndex + 1}`;
    
    // 规模
    items.push(`${fileLabel} - 规模：${file.rowCount} 行 × ${file.columnCount} 列`);
    
    // 数值：总量、均值、趋势（带「万」的列直接写出「即 XXX万 或 X.XX亿」，避免模型误写为 X.XX万）
    for (const [name, stats] of Object.entries(file.numericStats)) {
      const trendStr = stats.trend === 'up' ? `，趋势上升约${stats.trendPercent}%` : stats.trend === 'down' ? `，趋势下降约${stats.trendPercent}%` : '，趋势平稳';
      let sumStr = `${fileLabel} - ${name}：总计 ${formatNumber(stats.sum)}`;
      if (name.includes('万') && stats.sum >= 1000) {
        const yi = (stats.sum / 10000).toFixed(2);
        sumStr += `（引用时二选一：「${formatNumber(stats.sum)}万」或「${yi}亿」，严禁写「X.XX万」或「X.XX万万」）`;
      }
      sumStr += `，均值 ${formatNumber(stats.mean)}${trendStr}`;
      items.push(sumStr);
      items.push(`${fileLabel} - ${name}范围：${formatNumber(stats.min)} ～ ${formatNumber(stats.max)}，中位数 ${formatNumber(stats.median)}`);
    }
    
    // 分布与构成：分类 Top3、集中度
    for (const [name, stats] of Object.entries(file.categoryStats)) {
      const total = stats.distribution.reduce((s, d) => s + d.count, 0);
      const top3 = stats.topN.slice(0, 3);
      const top3Sum = top3.reduce((s, t) => s + t.count, 0);
      const pct = total > 0 ? (top3Sum / total * 100).toFixed(1) : '0';
      items.push(`${fileLabel} - ${name}分布 Top3：${top3.map(t => `${t.value}(${t.count}次)`).join('、')}；Top3集中度 ${pct}%`);
      items.push(`${fileLabel} - ${name}构成：共 ${stats.distribution.length} 个类别`);
    }
    
    // 时间范围（若有）
    for (const [name, stats] of Object.entries(file.dateStats)) {
      items.push(`${fileLabel} - ${name}范围：${stats.minDate} 至 ${stats.maxDate}，跨度 ${stats.spanDays} 天`);
    }
  }
  
  // 跨文件：关联与排名
  if (analysis.relationships.length > 0) {
    const relDesc = analysis.relationships
      .map(r => {
        const from = analysis.files[r.fromFileIndex].fileName?.replace(/\.(csv|xlsx?)$/i, '') || `文件${r.fromFileIndex + 1}`;
        const to = analysis.files[r.toFileIndex].fileName?.replace(/\.(csv|xlsx?)$/i, '') || `文件${r.toFileIndex + 1}`;
        return `${from}.${r.fromField}→${to}.${r.toField}（匹配率${Math.round(r.matchRate * 100)}%）`;
      })
      .join('；');
    items.push(`跨文件关联：${relDesc}`);
  }
  
  for (const stat of analysis.crossFileStats) {
    const total = stat.data.reduce((s, d) => s + d.value, 0);
    const top3Val = stat.data.slice(0, 3).reduce((s, d) => s + d.value, 0);
    const conc = total > 0 ? (top3Val / total * 100).toFixed(1) : '0';
    const top5 = stat.data.slice(0, 5).map(d => `${d.name} ${formatNumber(d.value)}`).join('、');
    items.push(`跨文件 - ${stat.title}：总计 ${formatNumber(total)}，Top3集中度 ${conc}%；Top5：${top5}`);
  }
  
  // 趋势（时间序列）
  const lineCharts = analysis.suggestedCharts.filter(c => c.chartType === 'line');
  for (const chart of lineCharts.slice(0, 2)) {
    if (chart.data.length >= 2) {
      const keys = Object.keys(chart.data[0]).filter(k => k !== 'name');
      const first = chart.data[0] as Record<string, unknown>;
      const last = chart.data[chart.data.length - 1] as Record<string, unknown>;
      const k = keys[0];
      const start = Number(first[k]) || 0;
      const end = Number(last[k]) || 0;
      const change = start !== 0 ? ((end - start) / Math.abs(start) * 100).toFixed(1) : '0';
      items.push(`趋势 - ${chart.title}：从 ${first.name} ${formatNumber(start)} 到 ${last.name} ${formatNumber(end)}，整体${Number(change) >= 0 ? '增长' : '下降'} ${Math.abs(Number(change))}%`);
    }
  }
  
  // 排名/对比图（柱状）
  const barCharts = analysis.suggestedCharts.filter(c => c.chartType === 'bar');
  for (const chart of barCharts.slice(0, 2)) {
    if (chart.data.length >= 2) {
      const keys = Object.keys(chart.data[0]).filter(k => k !== 'name');
      const k = keys[0];
      const total = chart.data.reduce((s, d) => s + (Number((d as Record<string, unknown>)[k]) || 0), 0);
      const top3 = chart.data.slice(0, 3).reduce((s, d) => s + (Number((d as Record<string, unknown>)[k]) || 0), 0);
      const conc = total > 0 ? (top3 / total * 100).toFixed(1) : '0';
      const top3Names = chart.data.slice(0, 3).map(d => (d as Record<string, unknown>).name).join('、');
      items.push(`排名 - ${chart.title}：Top3 为 ${top3Names}，Top3集中度 ${conc}%；共 ${chart.data.length} 项`);
    }
  }
  
  return items.slice(0, 22);
}

/**
 * 生成人类可读的分析摘要（供 AI 理解）
 * 包含数据分析领域的专业知识和业务洞察
 */
export function generateAnalysisSummary(analysis: DataAnalysis): string {
  const parts: string[] = [];
  
  // 口径与禁止项（供 AI 严格遵守）
  parts.push('## 报告撰写口径（务必遵守）\n');
  parts.push('**仅可使用**：本摘要下方「数据概况」「跨文件分析结果」「推荐图表」中**明确写出的**数字、比例、趋势描述。引用时请与原文表述一致。');
  parts.push('**禁止**：');
  parts.push('- 禁止自行计算比例或合计（如自己算「流行风格占比 93.3%」「厂牌集中度 100%」），除非本摘要中已给出该口径');
  parts.push('- 禁止对「出道年份」「成立年份」等年份类指标做求和或求和的业务解读（年份相加无业务含义）');
  parts.push('- 禁止编造本摘要中未出现的具体数字或断崖式变化（如「某歌曲 -100% 下跌」须与预计算趋势一致）');
  parts.push('');
  parts.push('**图表与口径**：折线图仅用于时间序列趋势；柱状图用于类别对比/排名。集中度指 Top3 占总量的比例，>80% 为高集中度。');
  parts.push('');
  
  // 文件概览
  parts.push('## 数据概况\n');
  for (const file of analysis.files) {
    parts.push(`### ${file.fileName || `文件 ${file.fileIndex + 1}`}`);
    parts.push(`- 规模：${file.rowCount} 行 × ${file.columnCount} 列`);
    
    // 字段分类说明
    const idFields = file.fields.filter(f => f.type === 'id');
    const dateFields = file.fields.filter(f => f.type === 'date');
    const numFields = file.fields.filter(f => f.type === 'number');
    const catFields = file.fields.filter(f => f.type === 'category');
    
    if (idFields.length > 0) {
      parts.push(`- ID/键字段：${idFields.map(f => f.name + (f.isPrimaryKey ? '[主键]' : f.isForeignKey ? '[外键]' : '')).join('、')}`);
    }
    if (dateFields.length > 0) {
      parts.push(`- 时间字段：${dateFields.map(f => f.name).join('、')}（可用于趋势分析）`);
    }
    if (numFields.length > 0) {
      parts.push(`- 数值字段：${numFields.map(f => f.name).join('、')}`);
    }
    if (catFields.length > 0) {
      parts.push(`- 分类字段：${catFields.map(f => f.name).join('、')}（可用于分组对比）`);
    }
    
    // 数值统计（增强版）
    for (const [name, stats] of Object.entries(file.numericStats)) {
      const trendDesc = stats.trend === 'up' 
        ? `📈上升${stats.trendPercent}%` 
        : stats.trend === 'down' 
          ? `📉下降${stats.trendPercent}%` 
          : '→稳定';
      
      // 变异系数（标准差/均值）判断数据离散程度
      const cv = stats.mean !== 0 ? (stats.stdDev / Math.abs(stats.mean)) * 100 : 0;
      const dispersionNote = cv > 50 ? '（离散度高）' : cv > 20 ? '（离散度中等）' : '（较集中）';
      
      parts.push(`- ${name}：`);
      parts.push(`  - 总计：${formatNumber(stats.sum)}，均值：${formatNumber(stats.mean)}，中位数：${formatNumber(stats.median)}`);
      parts.push(`  - 范围：${formatNumber(stats.min)} ~ ${formatNumber(stats.max)}${dispersionNote}`);
      parts.push(`  - 趋势：${trendDesc}`);
    }
    
    // 分类统计（增强版）
    for (const [name, stats] of Object.entries(file.categoryStats)) {
      const totalCount = stats.distribution.reduce((sum, d) => sum + d.count, 0);
      const top3 = stats.topN.slice(0, 3);
      const top3Sum = top3.reduce((sum, t) => sum + t.count, 0);
      const concentration = totalCount > 0 ? (top3Sum / totalCount * 100).toFixed(1) : 0;
      
      parts.push(`- ${name}分布：共 ${stats.distribution.length} 个类别`);
      parts.push(`  - Top3：${top3.map(t => `${t.value}(${t.count}次)`).join('、')}`);
      parts.push(`  - Top3集中度：${concentration}%`);
    }
    
    // 日期范围（增强版）
    for (const [name, stats] of Object.entries(file.dateStats)) {
      const timeSeriesNote = stats.isTimeSeries ? '（适合做趋势分析）' : '（非连续时间序列）';
      parts.push(`- ${name}范围：${stats.minDate} 至 ${stats.maxDate}`);
      parts.push(`  - 时间跨度：${stats.spanDays} 天${timeSeriesNote}`);
    }
    
    parts.push('');
  }
  
  // 关联关系（增强说明）
  if (analysis.relationships.length > 0) {
    parts.push('## 文件关联关系\n');
    parts.push('以下关联已自动检测，可用于跨文件分析：\n');
    for (const rel of analysis.relationships) {
      const fromFile = analysis.files[rel.fromFileIndex];
      const toFile = analysis.files[rel.toFileIndex];
      const relationDesc = {
        'one-to-one': '一对一',
        'one-to-many': '一对多',
        'many-to-one': '多对一',
      }[rel.relationType];
      parts.push(`- ${fromFile.fileName || `文件${rel.fromFileIndex + 1}`}.${rel.fromField} → ${toFile.fileName || `文件${rel.toFileIndex + 1}`}.${rel.toField}`);
      parts.push(`  - 关系类型：${relationDesc}，匹配率：${Math.round(rel.matchRate * 100)}%`);
    }
    parts.push('');
  }
  
  // 跨文件统计（增强版）
  if (analysis.crossFileStats.length > 0) {
    parts.push('## 跨文件分析结果（已计算，可直接引用）\n');
    for (const stat of analysis.crossFileStats) {
      parts.push(`### ${stat.title}`);
      parts.push(`说明：${stat.description}\n`);
      
      // 计算总量和集中度
      const totalValue = stat.data.reduce((sum, d) => sum + d.value, 0);
      const top3Value = stat.data.slice(0, 3).reduce((sum, d) => sum + d.value, 0);
      const concentration = totalValue > 0 ? (top3Value / totalValue * 100).toFixed(1) : 0;
      
      parts.push(`总计：${formatNumber(totalValue)}，Top3集中度：${concentration}%\n`);
      
      const top5 = stat.data.slice(0, 5);
      for (let i = 0; i < top5.length; i++) {
        const item = top5[i];
        const percent = totalValue > 0 ? (item.value / totalValue * 100).toFixed(1) : 0;
        parts.push(`${i + 1}. ${item.name}：${formatNumber(item.value)}（占比 ${percent}%）`);
      }
      if (stat.data.length > 5) {
        parts.push(`... 共 ${stat.data.length} 项`);
      }
      parts.push('');
    }
  }
  
  // 推荐图表（增强说明）
  if (analysis.suggestedCharts.length > 0) {
    parts.push('## 推荐图表（从中选择最能支撑核心观点的）\n');
    parts.push('**重要**：');
    parts.push('- 折线图(line)必须基于时间序列，展示趋势变化');
    parts.push('- 多系列折线图可以对比多个类别在同一时间轴上的表现差异');
    parts.push('- 柱状图(bar)用于类别对比、排名展示\n');
    
    // 分类展示图表
    const lineCharts = analysis.suggestedCharts.filter(c => c.chartType === 'line');
    const barCharts = analysis.suggestedCharts.filter(c => c.chartType === 'bar');
    
    if (lineCharts.length > 0) {
      parts.push('### 趋势图（折线图）\n');
      for (const chart of lineCharts.slice(0, 3)) {
        const seriesCount = chart.data.length > 0 
          ? Object.keys(chart.data[0]).filter(k => k !== 'name').length 
          : 0;
        const seriesNote = seriesCount > 1 ? `（${seriesCount}条曲线多系列对比）` : '';
        
        parts.push(`- **${chart.id}**: ${chart.title}${seriesNote}`);
        parts.push(`  - 说明：${chart.description}`);
        parts.push(`  - 时间点：${chart.data.length} 个`);
        parts.push(`  - 数据来源：${chart.source}`);
        
        // 展示趋势数据预览
        if (chart.data.length >= 2) {
          const keys = Object.keys(chart.data[0]).filter(k => k !== 'name');
          const firstPoint = chart.data[0] as Record<string, unknown>;
          const lastPoint = chart.data[chart.data.length - 1] as Record<string, unknown>;
          parts.push(`  - 数据预览：从 ${firstPoint.name} 到 ${lastPoint.name}`);
          for (const key of keys.slice(0, 3)) {
            const start = Number(firstPoint[key]) || 0;
            const end = Number(lastPoint[key]) || 0;
            const change = start !== 0 ? ((end - start) / Math.abs(start) * 100).toFixed(1) : 'N/A';
            parts.push(`    - ${key}: ${formatNumber(start)} → ${formatNumber(end)}（${change}%）`);
          }
        }
      }
      parts.push('');
    }
    
    if (barCharts.length > 0) {
      parts.push('### 对比图（柱状图）\n');
      for (const chart of barCharts.slice(0, 3)) {
        parts.push(`- **${chart.id}**: ${chart.title}`);
        parts.push(`  - 说明：${chart.description}`);
        parts.push(`  - 类别数：${chart.data.length} 个`);
        parts.push(`  - 数据来源：${chart.source}`);
      }
    }
  }
  
  return parts.join('\n');
}

/**
 * 选择最佳图表
 */
export function selectBestChart(analysis: DataAnalysis): ChartCandidate | null {
  if (analysis.suggestedCharts.length === 0) return null;
  return analysis.suggestedCharts[0]; // 已按相关性排序
}

/**
 * 判断数据丰富度，用于决定报告可展示的图表数量与章节数量
 * 信息量丰富时：多文件、有关联、多图表候选 → 建议多图表、多章节
 */
export function getDataRichness(analysis: DataAnalysis): {
  isRich: boolean;
  maxCharts: number;
  maxSections: number;
  hint: string;
} {
  const chartCount = analysis.suggestedCharts.length;
  const hasMultipleFiles = analysis.files.length > 1;
  const hasRelationships = analysis.relationships.length > 0;
  const hasCrossFileStats = analysis.crossFileStats.length > 0;
  const totalRows = analysis.files.reduce((sum, f) => sum + f.rowCount, 0);

  // 丰富条件：多文件 或 有关联/跨文件统计 或 图表候选≥3 且 总行数较多
  const isRich =
    hasMultipleFiles ||
    hasRelationships ||
    hasCrossFileStats ||
    (chartCount >= 3 && totalRows >= 20);

  const maxCharts = isRich ? Math.min(chartCount, 4) : 1;
  const maxSections = isRich ? 8 : 6;
  const reasons: string[] = [];
  if (hasMultipleFiles) reasons.push('多数据源');
  if (hasRelationships) reasons.push('存在关联关系');
  if (hasCrossFileStats) reasons.push('有跨文件统计');
  if (chartCount >= 3) reasons.push(`可展示图表候选${chartCount}个`);
  const hint = isRich
    ? `本数据信息量丰富（${reasons.join('、')}），建议报告包含 6-8 个章节，并选择 2-4 个图表分别展示不同维度的分析。`
    : '建议报告包含 4-6 个章节，选择 1 个最能支撑核心观点的图表。';

  return { isRich, maxCharts, maxSections, hint };
}

/**
 * 统一分析入口：供 generate-outline、generate-report 的 import 分支使用
 * 输入数据列表与可选文件名，输出预分析结果、引用清单、摘要、图表候选与丰富度
 */
export function getAnalysisInput(
  dataList: ParsedData[],
  fileNames?: string[]
): {
  dataAnalysis: DataAnalysis;
  citationList: string[];
  analysisSummary: string;
  suggestedCharts: ChartCandidate[];
  dataRichness: ReturnType<typeof getDataRichness>;
} {
  const names = fileNames || dataList.map((_, i) => `文件${i + 1}`);
  const dataAnalysis = analyzeData(dataList, names);
  const citationList = generateCitationList(dataAnalysis);
  const analysisSummary = generateAnalysisSummary(dataAnalysis);
  const dataRichness = getDataRichness(dataAnalysis);
  return {
    dataAnalysis,
    citationList,
    analysisSummary,
    suggestedCharts: dataAnalysis.suggestedCharts,
    dataRichness,
  };
}

export { formatNumber };
