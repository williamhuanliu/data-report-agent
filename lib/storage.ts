import { promises as fs } from 'fs';
import path from 'path';
import type { Report } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'reports');

/**
 * 确保数据目录存在
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * 保存报告
 */
export async function saveReport(report: Report): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${report.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * 获取报告
 */
export async function getReport(id: string): Promise<Report | null> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Report;
  } catch {
    return null;
  }
}

/**
 * 获取所有报告列表
 */
export async function listReports(): Promise<Report[]> {
  await ensureDataDir();
  
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const reports: Report[] = [];
    for (const file of jsonFiles) {
      const filePath = path.join(DATA_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      reports.push(JSON.parse(content) as Report);
    }
    
    // 按创建时间倒序排列
    reports.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return reports;
  } catch {
    return [];
  }
}

/**
 * 删除报告
 */
export async function deleteReport(id: string): Promise<boolean> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 更新报告
 */
export async function updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
  const report = await getReport(id);
  if (!report) {
    return null;
  }

  const updatedReport: Report = {
    ...report,
    ...updates,
    id, // Ensure ID cannot be changed
    createdAt: report.createdAt, // Ensure createdAt cannot be changed
  };

  await saveReport(updatedReport);
  return updatedReport;
}
