import { NextRequest, NextResponse } from 'next/server';
import { runOutlineGeneration } from '@/lib/generation/outline';
import type { CreateMode, ParsedData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mode,
      idea,
      pastedContent,
      data,
      dataList,
      title,
      model,
      fileNames,
    } = body as {
      mode: CreateMode;
      idea?: string;
      pastedContent?: string;
      data?: ParsedData;
      dataList?: ParsedData[];
      title?: string;
      model?: string;
      fileNames?: string[];
    };

    const result = await runOutlineGeneration({
      mode,
      idea,
      pastedContent,
      data,
      dataList,
      title,
      model,
      fileNames,
    });

    return NextResponse.json({ success: true, outline: result.outline });
  } catch (error) {
    console.error('生成大纲失败:', error);
    const message = error instanceof Error ? error.message : '生成大纲时发生错误';
    const isValidation =
      message === '请输入报告主题' ||
      message === '请粘贴内容' ||
      message === '请上传数据文件' ||
      message === '无效的创建模式';
    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
