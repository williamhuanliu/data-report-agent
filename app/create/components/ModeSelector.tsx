'use client';

import { Card } from '@/app/components/ui';
import type { CreateMode } from '@/lib/types';

interface ModeSelectorProps {
  onSelect: (mode: CreateMode) => void;
}

const MODES: { id: CreateMode; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'generate',
    title: '生成',
    description: '输入主题或想法，AI 自动生成报告结构与内容',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'paste',
    title: '粘贴',
    description: '粘贴已有数据或笔记，AI 自动识别并格式化为报告',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'import',
    title: '导入',
    description: '上传 Excel 或 CSV 文件，AI 分析数据生成报告',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
];

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
          创建数据报告
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          选择一种方式开始创建你的数据报告
        </p>
      </div>

      <div className="grid gap-4">
        {MODES.map((mode) => (
          <Card
            key={mode.id}
            className="p-6 rounded-[var(--radius-xl)] border border-[var(--border)] hover:border-[var(--color-primary)]/50 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => onSelect(mode.id)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                {mode.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
                  {mode.title}
                  <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{mode.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
