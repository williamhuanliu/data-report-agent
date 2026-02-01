'use client';

import { Button, Card } from '@/app/components/ui';
import type { ReportOutline, OutlineSection } from '@/lib/types';

interface OutlineEditorProps {
  outline: ReportOutline;
  onOutlineChange: (outline: ReportOutline) => void;
  onBack: () => void;
  onNext: () => void;
  /** 主按钮文案，默认「选择主题」 */
  nextLabel?: string;
  /** 主按钮加载态 */
  isLoading?: boolean;
  /** 为 true 时不渲染底部操作按钮（由外部固定底栏渲染） */
  hideActions?: boolean;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  summary: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  metrics: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  insight: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  recommendation: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
};

export function OutlineEditor({ outline, onOutlineChange, onBack, onNext, nextLabel = "选择主题", isLoading = false, hideActions = false }: OutlineEditorProps) {
  const toggleSection = (sectionId: string) => {
    const newSections = outline.sections.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    onOutlineChange({ ...outline, sections: newSections });
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    const newSections = outline.sections.map((s) =>
      s.id === sectionId ? { ...s, title } : s
    );
    onOutlineChange({ ...outline, sections: newSections });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= outline.sections.length) return;

    const newSections = [...outline.sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    onOutlineChange({ ...outline, sections: newSections });
  };

  const enabledCount = outline.sections.filter((s) => s.enabled).length;

  return (
    <div className="max-w-2xl mx-auto -mt-6">
      <div className="text-center mb-6">
        <h1 className="text-lg sm:text-xl font-bold text-foreground mb-2">
          大纲
        </h1>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">报告标题</label>
        <input
          type="text"
          value={outline.title}
          onChange={(e) => onOutlineChange({ ...outline, title: e.target.value })}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-border-focus"
        />
      </div>

      <div className="space-y-3 mb-6">
        {outline.sections.map((section, index) => (
          <Card
            key={section.id}
            className={`p-4 rounded-lg border transition-all ${
              section.enabled
                ? 'border-border bg-surface'
                : 'border-border bg-surface-elevated opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === outline.sections.length - 1}
                  className="p-1 rounded hover:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Section icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  section.enabled
                    ? 'bg-primary/10 text-primary'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                {SECTION_ICONS[section.type] || SECTION_ICONS.summary}
              </div>

              {/* Section content */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                  className="w-full bg-transparent font-medium text-foreground focus:outline-none"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {section.description}
                </p>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  section.enabled ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    section.enabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {!hideActions && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
          已启用 {enabledCount} / {outline.sections.length} 个章节
        </p>
      )}

      {!hideActions && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="lg" onClick={onBack} className="min-h-[44px] rounded-xl">
            返回
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            disabled={enabledCount === 0 || isLoading}
            loading={isLoading}
            className="min-h-[44px] rounded-xl flex-1"
          >
            {nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
