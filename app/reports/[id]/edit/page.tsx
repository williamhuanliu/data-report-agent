'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Alert } from '@/app/components/ui';
import { SectionEditDialog } from '@/app/components/report/SectionEditDialog';
import type { Report, AnalysisResult } from '@/lib/types';
import { getFriendlyErrorMessage } from '@/lib/error-messages';

type SectionType = 'summary' | 'metrics' | 'insights' | 'recommendations' | 'chart';

interface EditableSection {
  type: SectionType;
  title: string;
  content: unknown;
}

export default function ReportEditPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<SectionType | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (!res.ok) {
          if (res.status === 404) {
            router.push('/404');
            return;
          }
          throw new Error('加载报告失败');
        }
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportId, router]);

  const handleSectionUpdate = useCallback(
    (sectionType: SectionType, newContent: unknown) => {
      if (!report) return;

      const updatedAnalysis = { ...report.analysis };

      switch (sectionType) {
        case 'summary':
          updatedAnalysis.summary = newContent as string;
          break;
        case 'insights':
          updatedAnalysis.insights = newContent as string[];
          break;
        case 'recommendations':
          updatedAnalysis.recommendations = newContent as string[];
          break;
        case 'metrics':
          updatedAnalysis.keyMetrics = newContent as AnalysisResult['keyMetrics'];
          break;
        case 'chart':
          updatedAnalysis.chartData = newContent as AnalysisResult['chartData'];
          break;
      }

      setReport({ ...report, analysis: updatedAnalysis });
      setHasChanges(true);
      setEditingSection(null);
    },
    [report]
  );

  const handleSave = async () => {
    if (!report) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: report.analysis }),
      });

      if (!res.ok) {
        throw new Error('保存失败');
      }

      setHasChanges(false);
      router.push(`/reports/${reportId}?manage=1`);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const getSections = (): EditableSection[] => {
    if (!report) return [];

    return [
      { type: 'summary', title: '摘要', content: report.analysis.summary },
      { type: 'metrics', title: '关键指标', content: report.analysis.keyMetrics },
      { type: 'chart', title: '图表数据', content: report.analysis.chartData },
      { type: 'insights', title: '核心洞察', content: report.analysis.insights },
      { type: 'recommendations', title: '行动建议', content: report.analysis.recommendations },
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">报告不存在</p>
          <Link href="/" className="text-primary hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/reports/${reportId}?manage=1`}
              className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">返回报告</span>
            </Link>
            <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
              编辑：{report.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400 hidden sm:inline">
                未保存的更改
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
              className="rounded-lg"
            >
              保存
            </Button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6">
            <Alert variant="error" description={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          点击各章节右侧的编辑按钮，使用 AI 辅助修改内容
        </p>

        <div className="space-y-4">
          {getSections().map((section) => (
            <Card
              key={section.type}
              className="p-4 sm:p-6 rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-2">{section.title}</h3>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {section.type === 'summary' && (
                      <p>{section.content as string}</p>
                    )}
                    {section.type === 'insights' && (
                      <ul className="list-disc list-inside space-y-1">
                        {(section.content as string[]).slice(0, 3).map((item, i) => (
                          <li key={i} className="truncate">{item}</li>
                        ))}
                        {(section.content as string[]).length > 3 && (
                          <li className="text-zinc-400">... 共 {(section.content as string[]).length} 条</li>
                        )}
                      </ul>
                    )}
                    {section.type === 'recommendations' && (
                      <ul className="list-disc list-inside space-y-1">
                        {(section.content as string[]).slice(0, 3).map((item, i) => (
                          <li key={i} className="truncate">{item}</li>
                        ))}
                        {(section.content as string[]).length > 3 && (
                          <li className="text-zinc-400">... 共 {(section.content as string[]).length} 条</li>
                        )}
                      </ul>
                    )}
                    {section.type === 'metrics' && (
                      <p>{(section.content as AnalysisResult['keyMetrics']).length} 个关键指标</p>
                    )}
                    {section.type === 'chart' && (
                      <p>{((section.content as AnalysisResult['chartData']) || []).length} 个数据点</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingSection(section.type)}
                  className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center"
                  title="AI 编辑"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Edit Dialog */}
      {editingSection && report && (
        <SectionEditDialog
          open={true}
          onClose={() => setEditingSection(null)}
          sectionType={editingSection}
          currentContent={
            editingSection === 'summary'
              ? report.analysis.summary
              : editingSection === 'insights'
              ? report.analysis.insights
              : editingSection === 'recommendations'
              ? report.analysis.recommendations
              : editingSection === 'metrics'
              ? report.analysis.keyMetrics
              : report.analysis.chartData
          }
          reportId={reportId}
          onUpdate={(newContent) => handleSectionUpdate(editingSection, newContent)}
          reportModel={report.openrouterModel}
        />
      )}
    </div>
  );
}
