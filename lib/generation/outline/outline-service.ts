/**
 * 大纲生成 - 服务入口
 * 职责：校验请求 → 构建上下文 → 调用 LLM → 解析 → 可选合并 → 返回大纲
 */

import { getOpenRouterClient, getDefaultOpenRouterModel } from '@/lib/ai/openrouter';
import { buildOutlineContext } from './outline-context';
import {
  parseOutlineFromResponse,
  hasDuplicateSectionTypes,
  mergeDuplicateOutlineSections,
} from './outline-parser';
import type { OutlineRequest, OutlineResult } from './types';

function validateRequest(req: OutlineRequest): string | null {
  if (req.mode === 'generate') {
    return req.idea?.trim() ? null : '请输入报告主题';
  }
  if (req.mode === 'paste') {
    return req.pastedContent?.trim() ? null : '请粘贴内容';
  }
  if (req.mode === 'import') {
    const list = req.dataList?.length ? req.dataList : req.data ? [req.data] : [];
    const hasData = list.length > 0 && list.some((d) => d?.rows?.length);
    return hasData ? null : '请上传数据文件';
  }
  return '无效的创建模式';
}

/**
 * 执行大纲生成：校验 → 上下文 → LLM → 解析 → 合并（若需）→ 返回
 */
export async function runOutlineGeneration(request: OutlineRequest): Promise<OutlineResult> {
  const validationError = validateRequest(request);
  if (validationError) {
    throw new Error(validationError);
  }

  const context = buildOutlineContext({
    mode: request.mode,
    idea: request.idea,
    pastedContent: request.pastedContent,
    data: request.data,
    dataList: request.dataList,
    title: request.title,
    fileNames: request.fileNames,
  });

  const model = request.model ?? getDefaultOpenRouterModel();
  const response = await getOpenRouterClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: context.userPrompt },
    ],
    temperature: 0.3,
  });

  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('AI 返回内容为空');
  }

  let outline = parseOutlineFromResponse(responseContent);

  if (hasDuplicateSectionTypes(outline)) {
    try {
      outline = await mergeDuplicateOutlineSections(outline, model);
    } catch (err) {
      console.warn('大纲合并失败，使用原始大纲:', err);
    }
  }

  return { outline };
}
