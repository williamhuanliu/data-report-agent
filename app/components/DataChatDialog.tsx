"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import type { ParsedData } from "@/lib/excel-parser";

import { DEFAULT_OPENROUTER_MODEL_ID } from "@/lib/ai/openrouter";

const OPENROUTER_DEFAULT_MODEL = DEFAULT_OPENROUTER_MODEL_ID;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DataChatDialogProps {
  open: boolean;
  onClose: () => void;
  data: ParsedData;
  fileName?: string;
  /** 生成报告时传入对话摘要，用于定制报告 */
  onGenerateReport: (conversationContext: string) => void;
  generating?: boolean;
}

const PLACEHOLDERS = [
  "例如：本周流量和转化率有什么趋势？",
  "例如：哪个渠道的转化最好？",
  "例如：数据里有哪些异常需要关注？",
];

export function DataChatDialog({
  open,
  onClose,
  data,
  fileName,
  onGenerateReport,
  generating = false,
}: DataChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInputValue("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    setInputValue("");
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          provider: "openrouter",
          model: OPENROUTER_DEFAULT_MODEL,
          messages: [...messages, userMessage],
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "回复失败");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.content || "" },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "回复失败");
    } finally {
      setLoading(false);
    }
  };

  const buildConversationContext = (): string => {
    if (messages.length === 0) return "";
    const lines = messages
      .map((m) => `${m.role === "user" ? "用户" : "助手"}: ${m.content}`)
      .slice(-10);
    return "用户在与数据对话中关注的问题与结论：\n" + lines.join("\n");
  };

  const handleGenerateReport = () => {
    onGenerateReport(buildConversationContext());
    onClose();
  };

  const canGenerate = messages.length >= 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="与数据对话"
      description={
        fileName
          ? `基于「${fileName}」提问，AI 将根据数据回答`
          : "根据上传的数据提问"
      }
      size="lg"
    >
      {/* Gamma 风格：左侧简要信息 + 右侧对话区，或单栏对话 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧：数据摘要 - 小屏可折叠或隐藏 */}
        <aside className="hidden sm:flex flex-col w-56 flex-shrink-0 border-r border-border bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="p-4 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
            <p className="font-medium text-foreground">数据概览</p>
            <p>
              {data.rows.length} 行 × {data.headers.length} 列
            </p>
            <p className="pt-2 truncate" title={data.headers.join(", ")}>
              {data.headers.slice(0, 3).join(", ")}
              {data.headers.length > 3 ? "…" : ""}
            </p>
          </div>
        </aside>

        {/* 右侧：对话区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 消息列表 */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
                  针对这份数据提出问题，例如趋势、异常或指标对比
                </p>
                <p className="mt-2 text-xs text-zinc-400">{PLACEHOLDERS[0]}</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                    max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm
                    ${
                      msg.role === "user"
                        ? "bg-linear-to-r from-gradient-start to-gradient-end text-white rounded-br-md"
                        : "bg-surface-elevated border border-border text-foreground rounded-bl-md"
                    }
                  `}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-zinc-100 dark:bg-zinc-800 flex items-center gap-2 text-sm text-zinc-500">
                  <span
                    className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* 输入区 - Gamma 风格：圆角输入框 + 发送 */}
          <div className="flex-shrink-0 border-t border-border p-4 sm:p-6">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={PLACEHOLDERS[0]}
                rows={1}
                className="flex-1 min-h-[44px] max-h-32 px-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
                disabled={loading}
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleSend}
                loading={loading}
                disabled={!inputValue.trim()}
                className="flex-shrink-0 min-h-[44px] px-5"
                aria-label="发送"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </Button>
            </div>
          </div>

          {/* 底部：生成报告 */}
          <div className="flex-shrink-0 border-t border-border px-4 sm:px-6 py-4 flex justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerateReport}
              loading={generating}
              disabled={!canGenerate || generating}
              className="min-h-[44px]"
            >
              {canGenerate ? "基于对话生成报告" : "先提问再生成报告"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
