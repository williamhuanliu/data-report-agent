import { NextRequest, NextResponse } from 'next/server';
import { getReport, deleteReport, updateReport } from '@/lib/storage';
import type { AnalysisResult } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await getReport(id);
    
    if (!report) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ report });
  } catch (error) {
    console.error('获取报告失败:', error);
    return NextResponse.json(
      { error: '获取报告失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { analysis, title } = body as {
      analysis?: AnalysisResult;
      title?: string;
    };

    const updates: Record<string, unknown> = {};
    if (analysis) updates.analysis = analysis;
    if (title) updates.title = title;

    const updatedReport = await updateReport(id, updates);
    
    if (!updatedReport) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error('更新报告失败:', error);
    return NextResponse.json(
      { error: '更新报告失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteReport(id);
    
    if (!success) {
      return NextResponse.json(
        { error: '删除报告失败' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除报告失败:', error);
    return NextResponse.json(
      { error: '删除报告失败' },
      { status: 500 }
    );
  }
}
