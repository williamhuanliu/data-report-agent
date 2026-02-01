"use client";

import { useState } from "react";
import { Dialog } from "@/app/components/ui/Dialog";
import { Button } from "@/app/components/ui/Button";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

type SectionType =
  | "summary"
  | "metrics"
  | "insights"
  | "recommendations"
  | "chart";

interface SectionEditDialogProps {
  open: boolean;
  onClose: () => void;
  sectionType: SectionType;
  currentContent: unknown;
  reportId: string;
  onUpdate: (newContent: unknown) => void;
}

const SECTION_LABELS: Record<SectionType, string> = {
  summary: "摘要",
  metrics: "关键指标",
  insights: "核心洞察",
  recommendations: "行动建议",
  chart: "图表数据",
};

const QUICK_ACTIONS = [
  {
    id: "rewrite",
    label: "重新生成",
    description: "用不同的表述重写这部分内容",
  },
  { id: "expand", label: "扩展内容", description: "增加更多细节和深度" },
  { id: "simplify", label: "精简内容", description: "删减冗余，保留核心要点" },
  { id: "formal", label: "更正式", description: "调整为更正式的商务语气" },
];

export function SectionEditDialog({
  open,
  onClose,
  sectionType,
  currentContent,
  reportId,
  onUpdate,
}: SectionEditDialogProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const instruction = selectedAction || customInstruction.trim();
    if (!instruction) {
      setError("请选择一个操作或输入自定义指令");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/edit-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          sectionType,
          currentContent,
          instruction: selectedAction || customInstruction,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "编辑失败");
      }

      const data = await res.json();
      onUpdate(data.newContent);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const renderContentPreview = () => {
    if (sectionType === "summary") {
      return (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {currentContent as string}
        </p>
      );
    }

    if (sectionType === "insights" || sectionType === "recommendations") {
      const items = currentContent as string[];
      return (
        <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }

    if (sectionType === "metrics") {
      return (
        <p className="text-sm text-zinc-500">
          {(currentContent as unknown[]).length} 个指标
        </p>
      );
    }

    if (sectionType === "chart") {
      return (
        <p className="text-sm text-zinc-500">
          {((currentContent as unknown[]) || []).length} 个数据点
        </p>
      );
    }

    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`AI 编辑：${SECTION_LABELS[sectionType]}`}
      description="选择一个快捷操作或输入自定义指令"
    >
      <div className="space-y-6">
        {/* Current content preview */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            当前内容
          </label>
          <div className="p-3 rounded-lg bg-surface-elevated max-h-32 overflow-y-auto">
            {renderContentPreview()}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            快捷操作
          </label>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  setSelectedAction(action.id);
                  setCustomInstruction("");
                }}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedAction === action.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm text-foreground">
                  {action.label}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom instruction */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            或输入自定义指令
          </label>
          <textarea
            value={customInstruction}
            onChange={(e) => {
              setCustomInstruction(e.target.value);
              setSelectedAction(null);
            }}
            placeholder="例如：添加关于市场趋势的分析"
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-border-focus resize-none"
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm text-error">{error}</p>}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!selectedAction && !customInstruction.trim()}
            className="flex-1"
          >
            应用修改
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
