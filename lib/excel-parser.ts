import * as XLSX from 'xlsx';
import type { ParsedData } from './types';

// 重新导出类型，方便其他模块使用
export type { ParsedData } from './types';

/**
 * 判断是否为 CSV 文件
 */
function isCSVFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const csvTypes = ['text/csv', 'application/csv', 'text/plain'];
  return name.endsWith('.csv') || csvTypes.includes(file.type);
}

/**
 * 从 CSV 字符串解析为 ParsedData（Node 或浏览器均可使用，用于测试或服务端）
 */
export function parseCSVString(csvText: string): ParsedData {
  const workbook = XLSX.read(csvText, {
    type: 'string',
    codepage: 65001, // UTF-8
  });
  return workbookToParsedData(workbook);
}

/**
 * 将 XLSX Workbook 转为 ParsedData（内部复用）
 */
function workbookToParsedData(workbook: XLSX.WorkBook): ParsedData {
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
    raw: false,
  });
  if (jsonData.length === 0) {
    return { headers: [], rows: [], columnTypes: {} };
  }
  const headers = Object.keys(jsonData[0]);
  const columnTypes = detectColumnTypes(jsonData, headers);
  const rows = jsonData.map(row => convertRowTypes(row, columnTypes));
  return { headers, rows, columnTypes };
}

/**
 * 解析 Excel 或 CSV 文件
 * CSV 使用 UTF-8 解码，确保中文表头正确显示
 */
export async function parseExcelFile(file: File): Promise<ParsedData> {
  let workbook: XLSX.WorkBook;

  if (isCSVFile(file)) {
    const text = await file.text();
    workbook = XLSX.read(text, { type: 'string', codepage: 65001 });
  } else {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });
  }

  return workbookToParsedData(workbook);
}

/**
 * 检测每列的数据类型
 */
function detectColumnTypes(
  data: Record<string, unknown>[],
  headers: string[]
): Record<string, 'number' | 'date' | 'string'> {
  const columnTypes: Record<string, 'number' | 'date' | 'string'> = {};
  
  for (const header of headers) {
    const values = data
      .map(row => row[header])
      .filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) {
      columnTypes[header] = 'string';
      continue;
    }
    
    // 检查是否全是数字
    const allNumbers = values.every(v => {
      const str = String(v).replace(/,/g, '');
      return !isNaN(Number(str)) && str.trim() !== '';
    });
    
    if (allNumbers) {
      columnTypes[header] = 'number';
      continue;
    }
    
    // 检查是否是日期
    const allDates = values.every(v => {
      const date = new Date(String(v));
      return !isNaN(date.getTime());
    });
    
    if (allDates) {
      columnTypes[header] = 'date';
      continue;
    }
    
    columnTypes[header] = 'string';
  }
  
  return columnTypes;
}

/**
 * 根据检测的类型转换行数据
 */
function convertRowTypes(
  row: Record<string, unknown>,
  columnTypes: Record<string, 'number' | 'date' | 'string'>
): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(row)) {
    const type = columnTypes[key];
    
    if (value === null || value === undefined || value === '') {
      converted[key] = null;
      continue;
    }
    
    switch (type) {
      case 'number':
        converted[key] = Number(String(value).replace(/,/g, ''));
        break;
      case 'date':
        converted[key] = new Date(String(value)).toISOString();
        break;
      default:
        converted[key] = String(value);
    }
  }
  
  return converted;
}

/**
 * 将数据转换为 CSV 格式的字符串（用于发送给 AI）
 */
export function dataToCSVString(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const lines = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // 如果包含逗号或引号，需要用引号包裹
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

/**
 * 获取数据摘要统计
 */
export function getDataSummary(data: ParsedData): string {
  const { headers, rows, columnTypes } = data;
  
  const summary: string[] = [
    `数据概览：${rows.length} 行 × ${headers.length} 列`,
    '',
    '列信息：',
  ];
  
  for (const header of headers) {
    const type = columnTypes[header];
    const values = rows.map(r => r[header]).filter(v => v !== null);
    
    if (type === 'number') {
      const nums = values.map(v => Number(v));
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      summary.push(`- ${header} (数值): 最小=${min}, 最大=${max}, 平均=${avg.toFixed(2)}`);
    } else if (type === 'date') {
      summary.push(`- ${header} (日期): ${values.length} 个有效值`);
    } else {
      const uniqueCount = new Set(values.map(String)).size;
      summary.push(`- ${header} (文本): ${uniqueCount} 个唯一值`);
    }
  }
  
  return summary.join('\n');
}
