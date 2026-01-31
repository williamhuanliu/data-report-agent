/**
 * 将 API / 系统错误映射为用户可读的提示
 */
const ERROR_MAP: Record<string, string> = {
  'Missing credentials': '请配置对应的 API Key（.env.local）',
  'OPENAI_API_KEY': '请配置 OpenAI API Key',
  'ANTHROPIC_API_KEY': '请配置 Anthropic API Key',
  'OPENROUTER_API_KEY': '请配置 OpenRouter API Key',
  'Invalid API Key': 'API Key 无效，请检查配置',
  'rate limit': '请求过于频繁，请稍后再试',
  'timeout': '分析超时，请重试',
  'ECONNABORTED': '分析超时，请重试',
  'Failed to fetch': '网络异常，请检查网络后重试',
  'NetworkError': '网络异常，请重试',
};

export function getFriendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  for (const [key, message] of Object.entries(ERROR_MAP)) {
    if (lower.includes(key.toLowerCase())) return message;
  }

  return raw || '分析过程中发生错误，请重试';
}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateFileSize(size: number): { ok: boolean; message?: string } {
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: `文件大小超过 5MB，请上传 5MB 以内的 Excel 或 CSV 文件`,
    };
  }
  return { ok: true };
}
