'use client';

import { Button, Input } from '@/app/components/ui';

interface CreateModeGenerateProps {
  idea: string;
  onIdeaChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
  canProceed: boolean;
}

const EXAMPLE_PROMPTS = [
  '2024年Q4销售数据分析，重点关注华东区业绩',
  '电商双11活动效果复盘报告',
  '用户增长趋势分析与预测',
  'SaaS产品月度运营数据总结',
];

export function CreateModeGenerate({
  idea,
  onIdeaChange,
  title,
  onTitleChange,
  onBack,
  onNext,
  isLoading,
  canProceed,
}: CreateModeGenerateProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
          描述你的想法
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          输入报告主题或想法，AI 将为你生成报告结构
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            报告主题 *
          </label>
          <textarea
            value={idea}
            onChange={(e) => onIdeaChange(e.target.value)}
            placeholder="例如：本周销售数据分析，重点关注转化率变化"
            rows={4}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] resize-none"
          />
        </div>

        {/* Example prompts */}
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">试试这些示例：</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onIdeaChange(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-zinc-600 dark:text-zinc-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {prompt.slice(0, 20)}...
              </button>
            ))}
          </div>
        </div>

        <Input
          label="报告标题（可选）"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="留空将自动生成"
        />

        <div className="flex items-center gap-3 pt-4">
          <Button variant="secondary" size="lg" onClick={onBack} className="min-h-[44px] rounded-xl">
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
