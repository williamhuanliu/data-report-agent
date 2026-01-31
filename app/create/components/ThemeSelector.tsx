'use client';

import { Button, Card } from '@/app/components/ui';
import { REPORT_THEMES } from '@/lib/themes';

interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  onBack?: () => void;
  onNext?: () => void;
  isLoading?: boolean;
  /** 嵌入模式：只展示主题网格，不展示标题和底部按钮 */
  inline?: boolean;
}

export function ThemeSelector({
  selectedTheme,
  onThemeChange,
  onBack,
  onNext,
  isLoading,
  inline = false,
}: ThemeSelectorProps) {
  return (
    <div className={inline ? "max-w-2xl mx-auto" : "max-w-3xl mx-auto"}>
      {inline ? (
        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] mb-2">
            选择主题
          </h2>
        </div>
      ) : (
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-2">
            选择报告主题
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            为你的报告选择一个视觉风格
          </p>
        </div>
      )}

      <div className={`grid sm:grid-cols-3 gap-4 ${inline ? "mb-6" : "mb-8"}`}>
        {REPORT_THEMES.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          return (
            <Card
              key={theme.id}
              className={`p-4 rounded-[var(--radius-xl)] cursor-pointer transition-all ${
                isSelected
                  ? 'border-2 border-[var(--color-primary)] shadow-lg'
                  : 'border border-[var(--border)] hover:border-[var(--color-primary)]/50'
              }`}
              onClick={() => onThemeChange(theme.id)}
            >
              {/* Theme preview */}
              <div
                className="h-24 rounded-lg mb-3 overflow-hidden relative"
                style={{ background: theme.colors.background }}
              >
                {/* Mock report layout */}
                <div className="absolute inset-2 flex flex-col gap-1.5">
                  <div
                    className="h-3 rounded w-3/4"
                    style={{ background: theme.colors.text, opacity: 0.8 }}
                  />
                  <div
                    className="h-2 rounded w-1/2"
                    style={{ background: theme.colors.textMuted, opacity: 0.5 }}
                  />
                  <div className="flex gap-1.5 mt-1">
                    <div
                      className="flex-1 h-8 rounded"
                      style={{ background: theme.colors.surface }}
                    />
                    <div
                      className="flex-1 h-8 rounded"
                      style={{ background: theme.colors.surface }}
                    />
                  </div>
                  <div
                    className="h-6 rounded mt-1"
                    style={{
                      background: `linear-gradient(to right, ${theme.colors.gradientStart}, ${theme.colors.gradientEnd})`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">{theme.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{theme.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {!inline && onBack != null && onNext != null && (
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="lg" onClick={onBack} className="min-h-[44px] rounded-xl">
            返回
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            loading={isLoading}
            className="min-h-[44px] rounded-xl flex-1 bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)]"
          >
            生成报告
          </Button>
        </div>
      )}
    </div>
  );
}
