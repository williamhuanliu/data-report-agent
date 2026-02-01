'use client';

import { Button, Input, Card } from '@/app/components/ui';
import { FileUploader } from '@/app/components/FileUploader';
import { DataPreview } from '@/app/components/DataPreview';
import type { ParsedData } from '@/lib/types';

interface CreateModeImportProps {
  parsedData: ParsedData | null;
  fileName: string;
  onFileSelect: (file: File) => void;
  title: string;
  onTitleChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
  canProceed: boolean;
}

export function CreateModeImport({
  parsedData,
  fileName,
  onFileSelect,
  title,
  onTitleChange,
  onBack,
  onNext,
  isLoading,
  canProceed,
}: CreateModeImportProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          导入数据文件
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          上传 Excel 或 CSV 文件，AI 将分析数据并生成报告
        </p>
      </div>

      <div className="space-y-6">
        {!parsedData ? (
          <Card className="overflow-hidden rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors">
            <FileUploader onFileSelect={onFileSelect} isLoading={isLoading} />
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">{fileName}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {parsedData.rows.length} 行 · {parsedData.headers.length} 列
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Reset to allow new file selection
                  window.location.reload();
                }}
              >
                更换文件
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden bg-surface">
              <DataPreview data={parsedData} />
            </div>
          </div>
        )}

        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
          支持 .xlsx、.xls、.csv 格式，单文件不超过 5MB
        </p>

        <Input
          label="报告标题"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入报告标题"
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
