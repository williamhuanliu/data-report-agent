/**
 * 大纲与数据对齐校验
 * 当存在跨文件统计时，确保大纲中至少有一节与跨文件/关联相关；否则自动插入一节
 */

import type { DataAnalysis, ReportOutline, OutlineSection } from '@/lib/types';

const CROSS_FILE_KEYWORDS = [
  '跨文件',
  '跨数据',
  '跨数据源',
  '关联',
  '厂牌',
  '歌手',
  '艺人',
  '多文件',
  '按厂牌',
  '按歌手',
];

function sectionLooksCrossFile(section: OutlineSection): boolean {
  const text = `${section.title} ${section.description}`;
  return CROSS_FILE_KEYWORDS.some((k) => text.includes(k));
}

/**
 * 当 dataAnalysis.crossFileStats 非空时，校验大纲是否至少有一节与跨文件相关
 * 若无则插入一节 insight 类型「跨数据源分析」
 */
export function validateOutlineForImport(
  outline: ReportOutline,
  dataAnalysis: DataAnalysis | null
): ReportOutline {
  if (!dataAnalysis?.crossFileStats?.length) return outline;

  const hasCrossSection = outline.sections.some((s) => s.enabled && sectionLooksCrossFile(s));
  if (hasCrossSection) return outline;

  const newSection: OutlineSection = {
    id: `section_cross_${Date.now()}`,
    type: 'insight',
    title: '跨数据源分析',
    description: '按关联维度（如厂牌、歌手）的统计与排名、集中度等跨文件洞察',
    enabled: true,
  };

  const sections = [...outline.sections];
  let insertAt = sections.length;
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].type === 'chart' && sections[i].enabled) {
      insertAt = i + 1;
      break;
    }
  }
  sections.splice(insertAt, 0, newSection);

  return { ...outline, sections };
}
