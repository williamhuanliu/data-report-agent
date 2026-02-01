import { NextRequest } from "next/server";
import { runReportGeneration } from "@/lib/generation/report";
import type { CreateMode, ParsedData, ReportOutline } from "@/lib/types";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const {
          mode,
          idea,
          pastedContent,
          data,
          dataList,
          outline,
          theme,
          title,
          model,
          fileNames,
        } = body as {
          mode: CreateMode;
          idea?: string;
          pastedContent?: string;
          data?: ParsedData;
          dataList?: ParsedData[];
          outline: ReportOutline;
          theme: string;
          title: string;
          model?: string;
          fileNames?: string[];
        };

        await runReportGeneration(
          {
            mode,
            idea,
            pastedContent,
            data,
            dataList,
            outline,
            theme,
            title,
            model,
            fileNames,
          },
          {
            onEvent(ev) {
              sendEvent(ev);
            },
          }
        );

        controller.close();
      } catch (error) {
        console.error("生成报告失败:", error);
        const message =
          error instanceof Error ? error.message : "生成报告时发生错误";
        sendEvent({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
