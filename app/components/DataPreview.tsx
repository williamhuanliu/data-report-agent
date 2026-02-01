"use client";

import type { ParsedData } from "@/lib/excel-parser";

interface DataPreviewProps {
  data: ParsedData;
  maxRows?: number;
}

export function DataPreview({ data, maxRows = 10 }: DataPreviewProps) {
  const { headers, rows, columnTypes } = data;
  const displayRows = rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;

  if (headers.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">没有可显示的数据</div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "number":
        return "#";
      case "date":
        return "📅";
      default:
        return "T";
    }
  };

  const formatValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return "-";

    if (type === "number") {
      const num = Number(value);
      if (Number.isInteger(num)) return num.toLocaleString();
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    if (type === "date") {
      try {
        return new Date(String(value)).toLocaleDateString("zh-CN");
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" lang="zh-CN">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/50">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap [font-feature-settings:normal]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs shrink-0">
                      {getTypeIcon(columnTypes[header])}
                    </span>
                    <span className="break-keep">{header}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {displayRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                {headers.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-2.5 whitespace-nowrap ${
                      columnTypes[header] === "number"
                        ? "text-right font-mono"
                        : ""
                    }`}
                  >
                    {formatValue(row[header], columnTypes[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 text-center text-sm text-zinc-500 dark:text-zinc-400">
          还有 {rows.length - maxRows} 行数据未显示
        </div>
      )}

      <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap justify-between gap-2">
        <span>
          {rows.length} 行 × {headers.length} 列
        </span>
        <span>
          类型:{" "}
          {Object.values(columnTypes).filter((t) => t === "number").length}{" "}
          数值,
          {Object.values(columnTypes).filter((t) => t === "date").length} 日期,
          {Object.values(columnTypes).filter((t) => t === "string").length} 文本
        </span>
      </div>
    </div>
  );
}
