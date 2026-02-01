"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "../components/ThemeProvider";
import { Alert, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui";
import { OutlineEditor } from "../create/components/OutlineEditor";
import { ThemeSelector } from "../create/components/ThemeSelector";
import { ModelSelector } from "../create/components/ModelSelector";
import { GenerationProgress } from "../create/components/GenerationProgress";
import { OPENROUTER_MODELS } from "@/lib/ai/openrouter";
import type {
  Report,
  CreateMode,
  CreateStep,
  ParsedData,
  ReportOutline,
} from "@/lib/types";
import { parseExcelFile } from "@/lib/excel-parser";
import {
  getFriendlyErrorMessage,
  validateFileSize,
} from "@/lib/error-messages";

// 按时间分组报告（Gemini 风格）
function groupReportsByTime(
  reports: Report[]
): { label: string; items: Report[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: Report[] }[] = [
    { label: "今天", items: [] },
    { label: "昨天", items: [] },
    { label: "过去 7 天", items: [] },
    { label: "过去 30 天", items: [] },
    { label: "更早", items: [] },
  ];

  for (const report of reports) {
    const d = new Date(report.createdAt);
    if (d >= today) {
      groups[0].items.push(report);
    } else if (d >= yesterday) {
      groups[1].items.push(report);
    } else if (d >= last7Days) {
      groups[2].items.push(report);
    } else if (d >= last30Days) {
      groups[3].items.push(report);
    } else {
      groups[4].items.push(report);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme: appTheme, setTheme: setAppTheme } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarHoverId, setSidebarHoverId] = useState<string | null>(null);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const settingsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Create wizard state（支持多文件上传）
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [step, setStep] = useState<CreateStep>("mode");
  const [idea, setIdea] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<
    { id: string; fileName: string; parsedData: ParsedData }[]
  >([]);
  const [outline, setOutline] = useState<ReportOutline | null>(null);
  const [theme, setTheme] = useState("business");
  const defaultModelId = OPENROUTER_MODELS[0]?.id ?? "google/gemini-2.0-flash-001";
  const [selectedModel, setSelectedModel] = useState<string>(defaultModelId);
  const handleModelChange = useCallback((v: string) => {
    setSelectedModel(v);
    if (typeof localStorage !== "undefined") localStorage.setItem("data-report-model", v);
  }, []);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(
    null
  );
  const [generationProgress, setGenerationProgress] = useState(0);
  const userName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "用户";

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("获取列表失败");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  // 恢复用户上次选择的大模型
  useEffect(() => {
    const stored = localStorage.getItem("data-report-model");
    if (stored && OPENROUTER_MODELS.some((m) => m.id === stored)) {
      setSelectedModel(stored);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setCardMenuId(null);
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      )
        setUserMenuOpen(false);
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      )
        setSettingsOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleDelete(id: string, titleText: string) {
    if (!confirm(`确定要删除「${titleText}」吗？`)) return;
    setCardMenuId(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      await fetchReports();
    } catch {
      alert("删除失败，请重试");
    } finally {
      setDeletingId(null);
    }
  }

  const sortedReports = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [reports]
  );

  const groupedReports = useMemo(
    () => groupReportsByTime(sortedReports),
    [sortedReports]
  );

  const filteredGroupedReports = useMemo(() => {
    const q = sidebarSearchQuery.trim().toLowerCase();
    if (!q) return groupedReports;
    const filtered = sortedReports.filter((r) =>
      r.title.toLowerCase().includes(q)
    );
    return groupReportsByTime(filtered);
  }, [groupedReports, sortedReports, sidebarSearchQuery]);

  // Create wizard handlers
  const goToStep = useCallback((newStep: CreateStep) => {
    setStep(newStep);
  }, []);

  const handleModeSelect = (_selectedMode: CreateMode) => {
    // 单页创建：不再切换步骤，保留以兼容后续 outline/theme/generating
  };

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // 从单页「生成」直接提交：支持多文件，综合分析
  const handleStartFromCreatePage = async () => {
    if (uploadedFiles.length === 0) return;
    setError(null);
    setIsLoading(true);
    setMode("import");
    try {
      const response = await fetch("/api/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import",
          idea: idea.trim() || undefined,
          dataList: uploadedFiles.map((f) => f.parsedData),
          title: title.trim() || undefined,
          model: selectedModel,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "生成大纲失败");
      setOutline(result.outline);
      if (result.outline?.title) setTitle(result.outline.title);
      goToStep("outline");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    const sizeCheck = validateFileSize(file.size);
    if (!sizeCheck.ok) {
      setError(sizeCheck.message ?? "文件过大");
      return;
    }

    setIsLoading(true);
    try {
      const parsedData = await parseExcelFile(file);
      if (parsedData.rows.length === 0) {
        setError("文件中没有数据");
        setIsLoading(false);
        return;
      }
      const id = crypto.randomUUID();
      const isFirst = uploadedFiles.length === 0;
      setUploadedFiles((prev) => [
        ...prev,
        { id, fileName: file.name, parsedData },
      ]);
      if (isFirst) {
        const baseName = file.name.replace(/\.(xlsx?|csv)$/i, "");
        setTitle(`数据报告 - ${baseName}`);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFiles, selectedModel]);

  const handleGenerateReport = async () => {
    if (!outline) return;

    setError(null);
    goToStep("generating");
    setGenerationProgress(0);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          idea: mode === "generate" ? idea : undefined,
          pastedContent: mode === "paste" ? pastedContent : undefined,
          dataList: mode === "import" && uploadedFiles.length > 0 ? uploadedFiles.map((f) => f.parsedData) : undefined,
          outline,
          theme,
          title,
          model: selectedModel,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let reportId = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk
          .split("\n")
          .filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "progress") {
              setGeneratingSection(data.section);
              setGenerationProgress(data.progress);
            } else if (data.type === "complete") {
              reportId = data.reportId;
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      if (reportId) {
        router.push(`/reports/${reportId}?manage=1`);
      } else {
        throw new Error("未能获取报告 ID");
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      goToStep("outline");
    }
  };

  const handleBack = () => {
    // 主题已合并到 outline 页，generating 上一步为 outline
    const prevStepMap: Record<CreateStep, CreateStep | null> = {
      mode: null,
      input: "mode",
      outline: "mode",
      theme: "outline",
      generating: "outline",
    };
    const prev = prevStepMap[step];
    if (prev) goToStep(prev);
  };

  const resetCreate = () => {
    setMode(null);
    setStep("mode");
    setIdea("");
    setPastedContent("");
    setUploadedFiles([]);
    setOutline(null);
    setTheme("business");
    setTitle("");
    setError(null);
  };

  return (
    <div className="h-screen flex bg-[#f0f4f9] dark:bg-[#131314] overflow-hidden">
      {/* Gemini 风格侧边栏 */}
      <aside
        className={`${
          sidebarOpen ? "w-[280px]" : "w-0"
        } shrink-0 transition-all duration-200 ease-out overflow-hidden`}
      >
        <div className="w-[280px] h-screen flex flex-col bg-[#f0f4f9] dark:bg-[#1e1f20]">
          {/* 顶部：汉堡菜单按钮（Gemini 风格，左对齐） */}
          <div className="h-16 flex items-center px-2 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="w-12 h-12 flex items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#dde3ea] dark:hover:bg-[#37393b] transition-colors"
              aria-label="收起侧边栏"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* 新建按钮（Gemini 风格：胶囊 + 加号图标） */}
          <div className="px-3 pb-4">
            <button
              type="button"
              onClick={resetCreate}
              className="inline-flex items-center gap-3 h-12 pl-4 pr-6 rounded-full bg-[#dde3ea] dark:bg-[#37393b] text-[#1f1f1f] dark:text-[#e3e3e3] text-sm font-medium hover:bg-[#c8d3de] dark:hover:bg-[#484a4d] hover:shadow-md transition-all"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              新建报告
            </button>
          </div>

          {/* 搜索 */}
          <div className="px-3 pb-4">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6368] dark:text-[#9aa0a6]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                placeholder="搜索报告"
                className="w-full h-11 pl-12 pr-4 rounded-full bg-[#e3e8ed] dark:bg-[#2d2e2f] text-sm text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/30 dark:focus:ring-[#8ab4f8]/30 transition-all"
              />
            </div>
          </div>

          {/* 历史列表（Gemini 风格：分组 + 圆角胶囊） */}
          <nav className="flex-1 overflow-y-auto px-2">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 border-[#c4c7c5] border-t-[#1f1f1f] dark:border-t-[#e3e3e3] animate-spin" />
              </div>
            ) : filteredGroupedReports.length === 0 ? (
              <div className="py-16 text-center px-4">
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                  {sidebarSearchQuery.trim() ? "未找到匹配的报告" : "暂无报告"}
                </p>
              </div>
            ) : (
              filteredGroupedReports.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="px-4 py-2.5 text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                    {group.label}
                  </p>
                  <ul>
                    {group.items.map((report) => (
                      <li
                        key={report.id}
                        className="relative group"
                        onMouseEnter={() => setSidebarHoverId(report.id)}
                        onMouseLeave={() => setSidebarHoverId(null)}
                      >
                        <Link
                          href={`/reports/${report.id}?manage=1`}
                          className="flex items-center gap-3 px-4 py-3 rounded-full text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#dde3ea] dark:hover:bg-[#37393b] transition-colors"
                        >
                          <span className="truncate text-sm">
                            {report.title}
                          </span>
                        </Link>
                        {sidebarHoverId === report.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCardMenuId(
                                cardMenuId === report.id ? null : report.id
                              );
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#c8d3de] dark:hover:bg-[#484a4d] transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>
                        )}
                        {cardMenuId === report.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-3 top-full mt-1 w-44 rounded-2xl bg-white dark:bg-[#2d2f31] py-2 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50"
                          >
                            <Link
                              href={`/reports/${report.id}?manage=1`}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#37393b]"
                            >
                              <svg
                                className="w-5 h-5 text-[#5f6368] dark:text-[#9aa0a6]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              查看
                            </Link>
                            <Link
                              href={`/reports/${report.id}/edit`}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#37393b]"
                            >
                              <svg
                                className="w-5 h-5 text-[#5f6368] dark:text-[#9aa0a6]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                                />
                              </svg>
                              编辑
                            </Link>
                            <div className="my-1 mx-3 border-t border-[#e8eaed] dark:border-[#444746]" />
                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(report.id, report.title)
                              }
                              disabled={deletingId === report.id}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#c5221f] hover:bg-[#fce8e6] dark:hover:bg-[#4a2c2a] disabled:opacity-50"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                              {deletingId === report.id ? "删除中…" : "删除"}
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </nav>

          {/* 底部：设置（点击弹出主题菜单） */}
          <div className="relative px-2 py-3" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-full text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#dde3ea] dark:hover:bg-[#37393b] transition-colors text-left"
            >
              <svg
                className="w-5 h-5 text-[#5f6368] dark:text-[#9aa0a6] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm">设置</span>
            </button>
            {settingsOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-1 py-2 rounded-xl bg-white dark:bg-[#2d2f31] shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50 min-w-[160px]">
                <div className="px-3 py-1.5 text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                  主题
                </div>
                {[
                  { value: "light" as const, label: "浅色模式", icon: "sun" },
                  { value: "dark" as const, label: "深色模式", icon: "moon" },
                  {
                    value: "system" as const,
                    label: "跟随系统",
                    icon: "monitor",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setAppTheme(opt.value);
                      setSettingsOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#37393b] transition-colors"
                  >
                    {opt.icon === "sun" && (
                      <svg
                        className="w-4 h-4 text-[#5f6368] dark:text-[#9aa0a6]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    )}
                    {opt.icon === "moon" && (
                      <svg
                        className="w-4 h-4 text-[#5f6368] dark:text-[#9aa0a6]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    )}
                    {opt.icon === "monitor" && (
                      <svg
                        className="w-4 h-4 text-[#5f6368] dark:text-[#9aa0a6]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    <span>{opt.label}</span>
                    {appTheme === opt.value && (
                      <svg
                        className="w-4 h-4 ml-auto text-[#1a73e8]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] dark:bg-[#131314] overflow-hidden">
        {/* 顶栏 */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="w-12 h-12 flex items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#dde3ea] dark:hover:bg-[#37393b] transition-colors shrink-0"
                aria-label="展开侧边栏"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={resetCreate}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#dde3ea] dark:bg-[#37393b] text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#c8d3de] dark:hover:bg-[#484a4d] transition-colors shrink-0"
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
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm font-medium">新建</span>
              </button>
            )}
            <h1 className="text-xl font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
              数据报告
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#dde3ea] dark:hover:bg-[#37393b] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#dde3ea] dark:bg-[#37393b] flex items-center justify-center text-[#444746] dark:text-[#c4c7c5] text-sm font-medium">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-[#2d2e2f] border border-[#e5e7eb] dark:border-[#3c4043] py-2 shadow-lg z-50">
                  <div className="px-5 py-4 text-center border-b border-[#e5e7eb] dark:border-[#3c4043]">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#dde3ea] dark:bg-[#37393b] flex items-center justify-center text-[#444746] dark:text-[#c4c7c5] text-xl font-medium">
                      {userName.slice(0, 1).toUpperCase()}
                    </div>
                    <p className="text-base font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                      {userName}
                    </p>
                    <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                      {session?.user?.email}
                    </p>
                  </div>
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#37393b] rounded-lg mx-2 transition-colors"
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
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 创建向导区域 */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="max-w-3xl mx-auto px-6 py-8">
              {/* Error alert */}
              {error && (
                <div className="mb-6">
                  <Alert
                    variant="error"
                    description={error}
                    onDismiss={() => setError(null)}
                  />
                </div>
              )}

              {/* 创建页：极简 Gemini 风格 */}
              {step === "mode" && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
                  {/* 居中标题 */}
                  <div className="text-center mb-10">
                    <h2 className="text-4xl sm:text-5xl font-light text-[#1f1f1f] dark:text-[#e3e3e3] mb-3">
                      有什么可以帮你？
                    </h2>
                  </div>

                  {/* 主输入区域 - 类似 Gemini 的输入框 */}
                  <div className="w-full max-w-2xl">
                    <div className="rounded-3xl bg-white dark:bg-[#1e1f20] shadow-sm border border-[#dfe1e5] dark:border-[#3c4043] overflow-hidden">
                      {/* 已上传文件列表（支持多文件） */}
                      {uploadedFiles.length > 0 ? (
                        <div className="px-5 py-4 border-b border-[#f1f3f4] dark:border-[#3c4043] space-y-2 max-h-40 overflow-y-auto">
                          {uploadedFiles.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-3 py-1.5"
                            >
                              <div className="w-10 h-10 shrink-0 rounded-xl bg-[#e6f4ea] dark:bg-[#1e3a29] flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-[#34a853]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
                                  {f.fileName}
                                </p>
                                <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                                  {f.parsedData.rows.length} 行数据
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(f.id)}
                                className="shrink-0 text-xs text-[#5f6368] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] px-2 py-1 rounded hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]"
                                aria-label={`移除 ${f.fileName}`}
                              >
                                移除
                              </button>
                            </div>
                          ))}
                          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] pt-1">
                            共 {uploadedFiles.length} 个文件，将综合分析生成报告
                          </p>
                        </div>
                      ) : null}

                      {/* 输入框 */}
                      <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="描述你想生成的报告..."
                        rows={3}
                        className="w-full px-5 py-4 bg-transparent text-base text-[#1f1f1f] dark:text-[#e3e3e3] placeholder:text-[#9aa0a6] focus:outline-none resize-none"
                      />

                      {/* 底部操作栏：上传 + 大模型选择 + 发送 */}
                      <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-[#f1f3f4] dark:border-[#3c4043]">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* 上传按钮：用 relative 限制 file input 仅覆盖按钮，避免误触 */}
                          <label className="relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#37393b] cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              multiple
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (!files?.length) {
                                  e.target.value = "";
                                  return;
                                }
                                if (files.length === 1) {
                                  await handleFileSelect(files[0]);
                                  e.target.value = "";
                                  return;
                                }
                                setError(null);
                                setIsLoading(true);
                                const toAdd: { id: string; fileName: string; parsedData: ParsedData }[] = [];
                                try {
                                  for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    const sizeCheck = validateFileSize(file.size);
                                    if (!sizeCheck.ok) {
                                      setError(sizeCheck.message ?? "文件过大");
                                      break;
                                    }
                                    const parsedData = await parseExcelFile(file);
                                    if (parsedData.rows.length === 0) {
                                      setError("文件中没有数据");
                                      break;
                                    }
                                    toAdd.push({
                                      id: crypto.randomUUID(),
                                      fileName: file.name,
                                      parsedData,
                                    });
                                  }
                                  if (toAdd.length > 0) {
                                    const wasEmpty = uploadedFiles.length === 0;
                                    setUploadedFiles((prev) => [...prev, ...toAdd]);
                                    if (wasEmpty) {
                                      const baseName = toAdd[0].fileName.replace(/\.(xlsx?|csv)$/i, "");
                                      setTitle(`数据报告 - ${baseName}`);
                                    }
                                  }
                                } catch (err) {
                                  setError(getFriendlyErrorMessage(err));
                                } finally {
                                  setIsLoading(false);
                                }
                                e.target.value = "";
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                              />
                            </svg>
                          </label>
                          {/* 大模型选择（shadcn Select，避免与上传按钮误触） */}
                          <div className="min-w-0 max-w-[200px] shrink-0">
                            <Select value={selectedModel} onValueChange={handleModelChange}>
                              <SelectTrigger className="h-10 rounded-full border-[#e5e7eb] dark:border-[#3c4043] bg-[#f1f3f4] dark:bg-[#2d2e2f] text-sm">
                                <SelectValue placeholder="选择大模型" />
                              </SelectTrigger>
                              <SelectContent>
                                {OPENROUTER_MODELS.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 发送按钮 */}
                        <button
                          type="button"
                          onClick={handleStartFromCreatePage}
                          disabled={uploadedFiles.length === 0 || isLoading}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#1f1f1f] disabled:bg-[#e8eaed] dark:disabled:bg-[#3c4043] disabled:text-[#9aa0a6] disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 提示文案 */}
                    <p className="text-center text-xs text-[#9aa0a6] mt-4">
                      支持上传多个 Excel 或 CSV 文件，AI 将综合分析并生成报告
                    </p>
                  </div>
                </div>
              )}

              {/* Step: Outline */}
              {step === "outline" && outline && (
                <>
                  <OutlineEditor
                    outline={outline}
                    onOutlineChange={setOutline}
                    onBack={handleBack}
                    onNext={handleGenerateReport}
                    nextLabel="生成报告"
                    isLoading={isLoading}
                    hideActions
                  />
                  <div className="mt-10 space-y-6">
                    <ThemeSelector
                      selectedTheme={theme}
                      onThemeChange={setTheme}
                      inline
                    />
                    <ModelSelector
                      selectedModel={selectedModel}
                      onModelChange={handleModelChange}
                      inline
                    />
                  </div>
                </>
              )}

              {/* Step: Generating */}
              {step === "generating" && (
                <GenerationProgress
                  progress={generationProgress}
                  currentSection={generatingSection}
                  outline={outline}
                />
              )}
            </div>
          </div>

          {/* 大纲页：底部固定栏（返回 + 生成报告） */}
          {step === "outline" && outline && (
            <div className="shrink-0 border-t border-[#e5e7eb] dark:border-[#3c4043] bg-[#f8fafc] dark:bg-[#131314] px-6 py-4">
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="h-12 px-5 rounded-xl border border-[#e5e7eb] dark:border-[#3c4043] bg-white dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] text-sm font-medium hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e2f] transition-colors"
                >
                  返回
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={
                    outline.sections.filter((s) => s.enabled).length === 0 ||
                    isLoading
                  }
                  className="h-12 px-8 rounded-xl bg-[#1f1f1f] dark:bg-[#e3e3e3] text-white dark:text-[#1f1f1f] text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity inline-flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      生成中…
                    </>
                  ) : (
                    <>
                      生成报告
                      <span className="text-[#9aa0a6] dark:text-[#5f6368] font-normal">
                        （{outline.sections.filter((s) => s.enabled).length}{" "}
                        章节）
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
