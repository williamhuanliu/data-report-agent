/**
 * 报告生成领域 - 大纲与报告生成统一入口
 */

export { runOutlineGeneration } from './outline';
export type { OutlineRequest, OutlineResult } from './outline';

export { runReportGeneration } from './report';
export type { ReportRequest, ReportStreamEvent, ReportGenerationOptions } from './report';
