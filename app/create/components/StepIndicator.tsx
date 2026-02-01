'use client';

import type { CreateStep, CreateMode } from '@/lib/types';

interface StepIndicatorProps {
  currentStep: CreateStep;
  mode: CreateMode | null;
}

const STEPS: { id: CreateStep; label: string }[] = [
  { id: 'mode', label: '选择模式' },
  { id: 'input', label: '输入内容' },
  { id: 'outline', label: '调整大纲' },
  { id: 'theme', label: '选择主题' },
];

export function StepIndicator({ currentStep, mode }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isDisabled = index > currentIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${isActive ? 'bg-primary text-white' : ''}
                    ${isCompleted ? 'bg-success text-white' : ''}
                    ${isDisabled ? 'bg-border text-zinc-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`
                    mt-1.5 text-xs font-medium hidden sm:block
                    ${isActive ? 'text-foreground' : 'text-zinc-400'}
                  `}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    w-8 sm:w-16 h-0.5 mx-2 transition-colors
                    ${index < currentIndex ? 'bg-success' : 'bg-border'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
