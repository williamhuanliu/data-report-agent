import { NextResponse } from 'next/server';
import { listReports } from '@/lib/storage';

export async function GET() {
  try {
    const reports = await listReports();
    return NextResponse.json({ reports });
  } catch (error) {
    console.error('获取报告列表失败:', error);
    return NextResponse.json(
      { error: '获取报告列表失败' },
      { status: 500 }
    );
  }
}
