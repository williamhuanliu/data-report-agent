"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "../components/layout/AppHeader";
import { AppFooter } from "../components/layout/AppFooter";
import { Alert } from "../components/ui";
import { ModeSelector } from "./components/ModeSelector";
import { CreateModeGenerate } from "./components/CreateModeGenerate";
import { CreateModePaste } from "./components/CreateModePaste";
import { CreateModeImport } from "./components/CreateModeImport";
import { OutlineEditor } from "./components/OutlineEditor";
import { ThemeSelector } from "./components/ThemeSelector";
import { GenerationProgress } from "./components/GenerationProgress";
import { StepIndicator } from "./components/StepIndicator";
import type {
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

const STEP_ORDER: CreateStep[] = [
  "mode",
  "input",
  "outline",
  "theme",
  "generating",
];

function CreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [step, setStep] = useState<CreateStep>("mode");
  const [idea, setIdea] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [outline, setOutline] = useState<ReportOutline | null>(null);
  const [theme, setTheme] = useState("business");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(
    null
  );
  const [generationProgress, setGenerationProgress] = useState(0);

  // Initialize from URL params
  useEffect(() => {
    const urlStep = searchParams.get("step") as CreateStep | null;
    const urlMode = searchParams.get("mode") as CreateMode | null;
    if (urlStep && STEP_ORDER.includes(urlStep)) {
      setStep(urlStep);
    }
    if (urlMode) {
      setMode(urlMode);
    }
  }, [searchParams]);

  // Update URL when step changes
  const updateURL = useCallback(
    (newStep: CreateStep, newMode: CreateMode | null) => {
      const params = new URLSearchParams();
      params.set("step", newStep);
      if (newMode) params.set("mode", newMode);
      router.replace(`/create?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const goToStep = useCallback(
    (newStep: CreateStep) => {
      setStep(newStep);
      updateURL(newStep, mode);
    },
    [mode, updateURL]
  );

  const handleModeSelect = (selectedMode: CreateMode) => {
    setMode(selectedMode);
    setStep("input");
    updateURL("input", selectedMode);
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
      const data = await parseExcelFile(file);
      if (data.rows.length === 0) {
        setError("文件中没有数据");
        setIsLoading(false);
        return;
      }
      setParsedData(data);
      const baseName = file.name.replace(/\.(xlsx?|csv)$/i, "");
      setTitle(`数据报告 - ${baseName}`);
      setFileName(file.name);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateOutline = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          idea: idea.trim() ? idea : undefined,
          pastedContent: mode === "paste" ? pastedContent : undefined,
          data: mode === "import" ? parsedData : undefined,
          title,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "生成大纲失败");
      }

      setOutline(result.outline);
      if (result.outline.title) {
        setTitle(result.outline.title);
      }
      goToStep("outline");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

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
          idea: idea.trim() ? idea : undefined,
          pastedContent: mode === "paste" ? pastedContent : undefined,
          data: mode === "import" ? parsedData : undefined,
          outline,
          theme,
          title,
        }),
      });

      // Handle streaming response
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

  const canProceedFromInput = () => {
    if (mode === "generate") return idea.trim().length > 0;
    if (mode === "paste") return pastedContent.trim().length > 0;
    if (mode === "import") return parsedData !== null;
    return false;
  };

  const handleBack = () => {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      const prevStep = STEP_ORDER[currentIndex - 1];
      goToStep(prevStep);
    }
  };

  const currentStepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Step indicator */}
        {step !== "generating" && (
          <StepIndicator currentStep={step} mode={mode} />
        )}

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

        {/* Step: Mode Selection */}
        {step === "mode" && <ModeSelector onSelect={handleModeSelect} />}

        {/* Step: Input */}
        {step === "input" && mode === "generate" && (
          <CreateModeGenerate
            idea={idea}
            onIdeaChange={setIdea}
            title={title}
            onTitleChange={setTitle}
            onBack={handleBack}
            onNext={handleGenerateOutline}
            isLoading={isLoading}
            canProceed={canProceedFromInput()}
          />
        )}

        {step === "input" && mode === "paste" && (
          <CreateModePaste
            content={pastedContent}
            onContentChange={setPastedContent}
            title={title}
            onTitleChange={setTitle}
            onBack={handleBack}
            onNext={handleGenerateOutline}
            isLoading={isLoading}
            canProceed={canProceedFromInput()}
          />
        )}

        {step === "input" && mode === "import" && (
          <CreateModeImport
            parsedData={parsedData}
            fileName={fileName}
            onFileSelect={handleFileSelect}
            title={title}
            onTitleChange={setTitle}
            onBack={handleBack}
            onNext={handleGenerateOutline}
            isLoading={isLoading}
            canProceed={canProceedFromInput()}
          />
        )}

        {/* Step: Outline */}
        {step === "outline" && outline && (
          <OutlineEditor
            outline={outline}
            onOutlineChange={setOutline}
            onBack={handleBack}
            onNext={() => goToStep("theme")}
          />
        )}

        {/* Step: Theme */}
        {step === "theme" && (
          <ThemeSelector
            selectedTheme={theme}
            onThemeChange={setTheme}
            onBack={handleBack}
            onNext={handleGenerateReport}
            isLoading={isLoading}
          />
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <GenerationProgress
            progress={generationProgress}
            currentSection={generatingSection}
            outline={outline}
          />
        )}
      </main>

      {step !== "generating" && <AppFooter />}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-background">
          <AppHeader />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-500">加载中...</p>
            </div>
          </main>
        </div>
      }
    >
      <CreatePageContent />
    </Suspense>
  );
}
