'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '../components/layout/AppHeader';
import { AppFooter } from '../components/layout/AppFooter';
import {
  Button,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui';
import type { Report } from '@/lib/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportsListPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState<string | null>(null);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('获取列表失败');
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

  function openDeleteConfirm(id: string, title: string) {
    setDeleteConfirmId(id);
    setDeleteConfirmTitle(title);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;
    const idToDelete = deleteConfirmId;
    setDeletingId(idToDelete);
    try {
      const res = await fetch(`/api/reports/${idToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      await fetchReports();
    } catch {
      alert('删除失败，请重试');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-semibold text-foreground">我的报告</h1>
          <Link href="/create">
            <Button>新建报告</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-zinc-500 dark:text-zinc-400">加载中…</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-elevated p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-foreground font-medium mb-1">暂无报告</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">生成的数据报告会出现在这里</p>
            <Link href="/create">
              <Button>去创建第一份报告</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:px-5">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/reports/${report.id}?manage=1`}
                      className="block font-medium text-foreground hover:text-primary truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 rounded"
                    >
                      {report.title}
                    </Link>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/reports/${report.id}?manage=1`}
                      className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    >
                      查看
                    </Link>
                    <Link
                      href={`/reports/${report.id}/edit`}
                      className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    >
                      编辑
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(report.id, report.title)}
                      disabled={deletingId === report.id}
                      className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-error hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    >
                      {deletingId === report.id ? '删除中…' : '删除'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <AppFooter />

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmOpen(false);
            setDeleteConfirmId(null);
            setDeleteConfirmTitle(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除报告</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmTitle
                ? `确定要删除报告「${deleteConfirmTitle}」吗？此操作不可恢复。`
                : '确定要删除该报告吗？此操作不可恢复。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={!!deletingId}>
              {deletingId ? '删除中…' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
