/**
 * 大纲生成模块 - 请求与结果类型
 */

import type { CreateMode, ParsedData, ReportOutline } from '@/lib/types';

export interface OutlineRequest {
  mode: CreateMode;
  idea?: string;
  pastedContent?: string;
  data?: ParsedData;
  dataList?: ParsedData[];
  title?: string;
  model?: string;
  fileNames?: string[];
}

export interface OutlineResult {
  outline: ReportOutline;
}

export interface OutlineContext {
  systemPrompt: string;
  userPrompt: string;
}
