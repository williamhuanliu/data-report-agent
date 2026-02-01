/**
 * 报告质量管道
 * 校验、归一化、可选引用检查
 */

export {
  parseAndValidateAnalysisResult,
  analysisResultSchema,
  metricItemSchema,
  reportChartSchema,
  chartDataItemSchema,
} from './schema';
export type { ParsedAnalysisPayload } from './schema';

export { normalizeAnalysisResult } from './normalize';

export {
  checkCitations,
  logCitationWarnings,
  type CitationCheckOptions,
  type CitationCheckResult,
} from './citation-check';

export {
  checkCrossFileInsight,
  logCrossFileWarning,
  type CrossFileCheckResult,
} from './cross-file-check';

export {
  computeQualityScore,
  logQualityScore,
  type QualityScoreResult,
  type QualityScoreDimensions,
} from './quality-score';

export {
  checkNoRecordWording,
  logNoRecordWarnings,
  type NoRecordCheckResult,
} from './no-record-check';
