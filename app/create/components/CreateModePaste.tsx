"use client";

import { Button, Input } from "@/app/components/ui";

interface CreateModePasteProps {
  content: string;
  onContentChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
  canProceed: boolean;
}

export function CreateModePaste({
  content,
  onContentChange,
  title,
  onTitleChange,
  onBack,
  onNext,
  isLoading,
  canProceed,
}: CreateModePasteProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          粘贴内容
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          粘贴数据、笔记或从其他工具复制的内容，AI 将自动识别并格式化
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            内容 *
          </label>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={`粘贴你的数据或笔记...

支持的格式：
- 表格数据（从 Excel 复制）
- CSV 格式
- 纯文本笔记
- ChatGPT 等 AI 输出的内容`}
            rows={12}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-border-focus resize-none font-mono text-sm"
          />
        </div>

        {content.trim().length > 0 && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            已输入 {content.length} 个字符
          </div>
        )}

        <Input
          label="报告标题（可选）"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="留空将自动生成"
        />

        <div className="flex items-center gap-3 pt-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={onBack}
            className="min-h-[44px] rounded-xl"
          >
            返回
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            loading={isLoading}
            disabled={!canProceed}
            className="min-h-[44px] rounded-xl flex-1"
          >
            生成大纲
          </Button>
        </div>
      </div>
    </div>
  );
}
