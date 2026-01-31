/**
 * 基于数据的对话 Prompt
 */

export const DATA_CHAT_SYSTEM_PROMPT = `你是一位资深的数据分析师助手。用户已上传一份数据文件，你需要根据数据内容回答用户的问题。

规则：
1. 回答必须基于用户提供的数据，不要编造数据
2. 用简洁、专业的语言，必要时用数字和趋势说明
3. 若数据中无法得出答案，如实说明并建议用户关注哪些字段
4. 可以指出数据中的异常、趋势或关键发现
5. 回答用中文，保持友好、易懂`;

export function buildDataContextForChat(dataSummary: string, csvPreview: string): string {
  return `【当前数据概览】
${dataSummary}

【数据内容（CSV 前 50 行）】
\`\`\`
${csvPreview}
\`\`\``;
}
