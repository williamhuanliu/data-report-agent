'use client';

import { useCallback, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

function isValidFile(file: File): boolean {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'text/csv',
    'application/csv',
  ];
  const validExtensions = ['.xlsx', '.xls', '.csv'];

  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  return hasValidType || hasValidExtension;
}

export function FileUploader({ onFileSelect, isLoading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file)) {
      setFileName(file.name);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFile(file)) {
      setFileName(file.name);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label={fileName ? '点击或拖拽以更换文件' : '拖拽文件到这里，或点击上传'}
      className={`
        relative border-2 border-dashed rounded-lg p-8 sm:p-12
        transition-all duration-normal cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2
        ${isDragging
          ? 'border-primary bg-linear-to-br from-gradient-start/5 to-gradient-end/5 scale-[1.01]'
          : 'border-border hover:border-zinc-400 dark:hover:border-zinc-500'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isLoading}
        aria-label="选择 Excel 或 CSV 文件"
      />

      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <svg
            className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {fileName ? (
          <>
            <p className="text-base sm:text-lg font-medium text-foreground">
              {fileName}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              点击或拖拽以更换文件
            </p>
          </>
        ) : (
          <>
            <p className="text-base sm:text-lg font-medium text-foreground">
              拖拽文件到这里，或点击上传
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              支持 Excel (.xlsx, .xls) 和 CSV 文件
            </p>
          </>
        )}
      </div>
    </div>
  );
}
