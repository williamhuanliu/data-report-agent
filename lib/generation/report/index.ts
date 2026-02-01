/**
 * 报告生成模块
 * 对外入口：runReportGeneration(request, { onEvent }) → { reportId }
 */

export { runReportGeneration } from './report-service';
export type { ReportRequest, ReportStreamEvent, ReportGenerationOptions } from './types';
