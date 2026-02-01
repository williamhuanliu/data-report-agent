/**
 * 大纲生成 - 按模式构建 Prompt 上下文
 * 职责：根据 mode 与 payload 产出 systemPrompt + userPrompt，import 时依赖数据分析结果
 */

import {
  OUTLINE_SYSTEM_PROMPT,
  buildOutlinePrompt,
  ENHANCED_OUTLINE_SYSTEM_PROMPT,
  buildEnhancedOutlinePrompt,
} from '@/lib/ai/prompt';
import { getAnalysisInput } from '@/lib/data-analyzer';
import type { CreateMode, ParsedData } from '@/lib/types';
import type { OutlineContext } from './types';

export interface BuildOutlineContextInput {
  mode: CreateMode;
  idea?: string;
  pastedContent?: string;
  data?: ParsedData;
  dataList?: ParsedData[];
  title?: string;
  fileNames?: string[];
}

/**
 * 构建大纲生成的 LLM 上下文（system + user prompt）
 * import 模式会调用 getAnalysisInput，其余模式仅做字符串拼接
 */
export function buildOutlineContext(input: BuildOutlineContextInput): OutlineContext {
  const { mode, idea, pastedContent, data, dataList, title, fileNames } = input;

  if (mode === 'generate') {
    const content = (idea ?? '').trim();
    return {
      systemPrompt: OUTLINE_SYSTEM_PROMPT,
      userPrompt: buildOutlinePrompt(mode, content, title),
    };
  }

  if (mode === 'paste') {
    const content = (pastedContent ?? '').trim();
    return {
      systemPrompt: OUTLINE_SYSTEM_PROMPT,
      userPrompt: buildOutlinePrompt(mode, content, title),
    };
  }

  if (mode === 'import') {
    const list = dataList?.length ? dataList : data ? [data] : [];
    const names = fileNames ?? list.map((_, i) => `文件${i + 1}`);
    const { analysisSummary, dataRichness } = getAnalysisInput(list, names);
    return {
      systemPrompt: ENHANCED_OUTLINE_SYSTEM_PROMPT,
      userPrompt: buildEnhancedOutlinePrompt(analysisSummary, title, dataRichness, idea?.trim()),
    };
  }

  throw new Error('无效的创建模式');
}
