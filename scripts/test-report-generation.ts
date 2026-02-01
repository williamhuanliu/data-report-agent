/**
 * 使用 test-data 下的 CSV 调用生成大纲与报告 API，并输出报告路径供检查。
 * 运行前请先启动 dev 服务：npm run dev
 * 运行：npx tsx scripts/test-report-generation.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseCSVString } from '../lib/excel-parser';
import type { ParsedData } from '../lib/types';
import type { ReportOutline } from '../lib/types';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function loadTestData(): Promise<{ dataList: ParsedData[]; fileNames: string[] }> {
  const testDataDir = path.join(process.cwd(), 'test-data');
  const files = fs.readdirSync(testDataDir).filter((f) => f.endsWith('.csv'));
  if (files.length === 0) throw new Error('test-data 下没有 CSV 文件');

  const dataList: ParsedData[] = [];
  const fileNames: string[] = [];
  for (const file of files) {
    const filePath = path.join(testDataDir, file);
    const csvText = fs.readFileSync(filePath, 'utf-8');
    dataList.push(parseCSVString(csvText));
    fileNames.push(path.basename(file, '.csv'));
  }
  return { dataList, fileNames };
}

async function generateOutline(
  dataList: ParsedData[],
  fileNames: string[],
  title?: string
): Promise<ReportOutline> {
  const res = await fetch(`${BASE}/api/generate-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'import',
      dataList,
      fileNames,
      title: title || '测试报告',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`generate-outline failed: ${res.status} ${err}`);
  }
  const json = await res.json();
  if (!json.outline) throw new Error('No outline in response');
  return json.outline as ReportOutline;
}

async function generateReport(
  dataList: ParsedData[],
  fileNames: string[],
  outline: ReportOutline,
  title: string
): Promise<string> {
  const res = await fetch(`${BASE}/api/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'import',
      dataList,
      fileNames,
      outline,
      theme: 'default',
      title,
    }),
  });
  if (!res.ok) throw new Error(`generate-report failed: ${res.status}`);
  if (!res.body) throw new Error('No body');

  let reportId: string | null = null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as { type: string; reportId?: string };
          if (data.type === 'complete' && data.reportId) reportId = data.reportId;
          if (data.type === 'error') throw new Error((data as { message?: string }).message || 'API error');
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
  if (!reportId) throw new Error('No reportId in SSE stream');
  return reportId;
}

async function main() {
  console.log('加载 test-data CSV...');
  const { dataList, fileNames } = await loadTestData();
  console.log('文件:', fileNames.join(', '));

  console.log('生成大纲...');
  const title = '测试报告 - 多文件关联分析';
  const outline = await generateOutline(dataList, fileNames, title);
  console.log('大纲章节数:', outline.sections?.length ?? 0);

  console.log('生成报告（SSE）...');
  const reportId = await generateReport(dataList, fileNames, outline, title);
  const reportPath = path.join(process.cwd(), 'data', 'reports', `${reportId}.json`);
  console.log('报告已保存:', reportPath);

  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    console.log('\n--- 报告摘要 ---');
    console.log('标题:', report.title);
    console.log('summary 长度:', report.analysis?.summary?.length ?? 0);
    console.log('insights 条数:', report.analysis?.insights?.length ?? 0);
    console.log('recommendations 条数:', report.analysis?.recommendations?.length ?? 0);
    console.log('图表:', report.analysis?.charts?.length ?? report.analysis?.chartData ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
