"use client";

import { OPENROUTER_MODELS } from "@/lib/ai/openrouter";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  /** 嵌入模式：紧凑布局 */
  inline?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  inline = false,
}: ModelSelectorProps) {
  return (
    <div className={inline ? "" : "max-w-2xl mx-auto"}>
      <label className="block text-sm font-medium text-foreground mb-2">
        大模型
      </label>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border-focus"
        aria-label="选择大模型"
      >
        {OPENROUTER_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
