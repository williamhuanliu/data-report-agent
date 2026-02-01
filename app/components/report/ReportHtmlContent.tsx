"use client";

import DOMPurify from "isomorphic-dompurify";
import { useRef, useEffect } from "react";
import * as echarts from "echarts";
import type { Report } from "@/lib/types";

interface ReportHtmlContentProps {
  report: Report;
  /** 大模型生成的报告正文 HTML（图表为带 data-echarts-option 的 div，前端用 ECharts 渲染） */
  contentHtml: string;
}

/** 允许的标签：正文 + 表格 + 图表容器 div */
const ALLOWED_TAGS = [
  "div",
  "section",
  "article",
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "span",
  "br",
  "hr",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
];

/** 允许的属性：图表 div 的 data-echarts-option、class */
const ADD_ATTR = ["data-echarts-option", "class"];

/** 报告图表主题：配色与基础样式 */
const REPORT_CHART_THEME = {
  color: [
    "#6366f1",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#84cc16",
  ],
  backgroundColor: "transparent",
  textStyle: {
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif',
    fontSize: 12,
    color: "#64748b",
  },
  title: {
    textStyle: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
    left: "center",
    top: 12,
    padding: [0, 0, 22, 0],
  },
  legend: {
    bottom: 12,
    left: "center",
    top: undefined,
    orient: "horizontal",
    textStyle: { fontSize: 12, color: "#64748b" },
    itemWidth: 14,
    itemHeight: 10,
    itemGap: 20,
  },
  grid: {
    left: 48,
    right: 24,
    top: 68,
    bottom: 64,
    containLabel: false,
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: "#e2e8f0" } },
    axisTick: { show: false },
    axisLabel: { color: "#64748b", fontSize: 11 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#64748b", fontSize: 11 },
    splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
  },
  line: {
    smooth: 0.35,
    symbol: "circle",
    symbolSize: 8,
    showSymbol: true,
    lineStyle: {
      width: 2.5,
      shadowColor: "rgba(0,0,0,0.08)",
      shadowBlur: 8,
      shadowOffsetY: 2,
    },
    itemStyle: { borderWidth: 2, borderColor: "#fff" },
    emphasis: {
      focus: "series",
      scale: 1.1,
      itemStyle: { borderWidth: 3 },
      lineStyle: { width: 3 },
    },
  },
  bar: {
    barMaxWidth: 36,
    barGap: "30%",
    barCategoryGap: "40%",
    itemStyle: { borderRadius: [4, 4, 0, 0] },
    emphasis: {
      focus: "series",
      itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.15)" },
    },
  },
  pie: {
    radius: ["42%", "72%"],
    center: ["50%", "48%"],
    avoidLabelOverlap: true,
    selectedOffset: 6,
    label: {
      show: true,
      fontSize: 12,
      color: "#475569",
      formatter: "{b}\n{d}%",
      position: "outside",
      minMargin: 6,
      overflow: "truncate",
      width: 72,
    },
    labelLine: {
      show: true,
      length: 14,
      length2: 10,
      smooth: true,
      lineStyle: { color: "#cbd5e1", width: 1 },
    },
    itemStyle: {
      borderColor: "#fff",
      borderWidth: 2,
      shadowBlur: 8,
      shadowColor: "rgba(0,0,0,0.08)",
      shadowOffsetY: 2,
    },
    emphasis: {
      scale: true,
      scaleSize: 6,
      itemStyle: {
        shadowBlur: 14,
        shadowColor: "rgba(0,0,0,0.14)",
        borderWidth: 2,
      },
      label: { show: true, fontWeight: 600 },
      labelLine: { show: true },
    },
  },
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { fontSize: 12, color: "#334155" },
    confine: true,
  },
};

/** 折线图渐变色（与主题色对应，用于 areaStyle） */
const LINE_GRADIENT_COLORS = [
  { main: "#6366f1", fill: "rgba(99,102,241,0.28)" },
  { main: "#8b5cf6", fill: "rgba(139,92,246,0.28)" },
  { main: "#06b6d4", fill: "rgba(6,182,212,0.28)" },
  { main: "#10b981", fill: "rgba(16,185,129,0.28)" },
  { main: "#f59e0b", fill: "rgba(245,158,11,0.28)" },
  { main: "#ef4444", fill: "rgba(239,68,68,0.28)" },
];

/** 为折线图系列添加渐变填充与高级样式 */
function enhanceLineChartOption(
  option: Record<string, unknown>
): Record<string, unknown> {
  const series = option.series as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(series)) return option;
  const hasLine = series.some((s) => s.type === "line");
  if (!hasLine) return option;

  const out = { ...option };
  (out as Record<string, unknown>).series = series.map((s, i) => {
    if (s.type !== "line") return s;
    const colors = LINE_GRADIENT_COLORS[i % LINE_GRADIENT_COLORS.length];
    return {
      ...s,
      smooth: s.smooth ?? 0.35,
      symbol: s.symbol ?? "circle",
      symbolSize: s.symbolSize ?? 8,
      showSymbol: s.showSymbol !== false,
      lineStyle: {
        ...(typeof s.lineStyle === "object" && s.lineStyle ? s.lineStyle : {}),
        width: 2.5,
        shadowColor: "rgba(0,0,0,0.08)",
        shadowBlur: 8,
        shadowOffsetY: 2,
      },
      itemStyle: {
        ...(typeof s.itemStyle === "object" && s.itemStyle ? s.itemStyle : {}),
        borderWidth: 2,
        borderColor: "#fff",
      },
      areaStyle: s.areaStyle ?? {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: colors.fill },
            { offset: 1, color: "rgba(255,255,255,0)" },
          ],
        },
      },
      emphasis: {
        focus: "series",
        scale: 1.1,
        itemStyle: { borderWidth: 3 },
        lineStyle: { width: 3 },
        ...(typeof s.emphasis === "object" && s.emphasis ? s.emphasis : {}),
      },
    };
  });
  return out;
}

/** 条形图/柱状图配色（与主题一致，用于渐变） */
const BAR_GRADIENT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#84cc16",
];

/** 为条形图/柱状图添加渐变与高级样式 */
function enhanceBarChartOption(
  option: Record<string, unknown>
): Record<string, unknown> {
  const series = option.series as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(series)) return option;
  const hasBar = series.some((s) => s.type === "bar");
  if (!hasBar) return option;

  const xAxis = option.xAxis as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  const yAxis = option.yAxis as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  const x0 = Array.isArray(xAxis) ? xAxis[0] : xAxis;
  const y0 = Array.isArray(yAxis) ? yAxis[0] : yAxis;
  const isHorizontal =
    (x0 as Record<string, unknown>)?.type === "value" &&
    (y0 as Record<string, unknown>)?.type === "category";

  const out = { ...option };
  (out as Record<string, unknown>).series = series.map((s, i) => {
    if (s.type !== "bar") return s;
    const color = BAR_GRADIENT_COLORS[i % BAR_GRADIENT_COLORS.length];
    // 使用单一数值，ECharts 对柱/条四角统一圆角，横竖方向都正确
    const borderRadius = 6;
    return {
      ...s,
      barMaxWidth: s.barMaxWidth ?? 28,
      barGap: s.barGap ?? "25%",
      barCategoryGap: s.barCategoryGap ?? "35%",
      itemStyle: {
        ...(typeof s.itemStyle === "object" && s.itemStyle ? s.itemStyle : {}),
        borderRadius,
        color: {
          type: "linear",
          x: isHorizontal ? 0 : 0,
          y: isHorizontal ? 0 : 1,
          x2: isHorizontal ? 1 : 0,
          y2: isHorizontal ? 0 : 0,
          colorStops: [
            { offset: 0, color },
            { offset: 1, color: `${color}99` },
          ],
        },
        shadowBlur: 6,
        shadowColor: "rgba(0,0,0,0.08)",
        shadowOffsetY: 2,
      },
      emphasis: {
        focus: "series",
        itemStyle: {
          shadowBlur: 12,
          shadowColor: "rgba(0,0,0,0.12)",
          borderColor: "#fff",
          borderWidth: 1,
        },
        ...(typeof s.emphasis === "object" && s.emphasis ? s.emphasis : {}),
      },
    };
  });
  return out;
}

/** 所有图表：legend 置于底部，并与图表主体保持较大间距 */
const LEGEND_BOTTOM_GAP = 24;
const CARTESIAN_GRID_TOP = 72;
const CARTESIAN_GRID_BOTTOM = 100;
/** 饼图圆心 Y（%），下移以增大标题与饼图间距 */
const PIE_CENTER_Y = "50%";

/** 饼图图例放右侧时的圆心 X，左移以留出图例空间 */
const PIE_CENTER_X_WHEN_LEGEND_RIGHT = "42%";

function applyLegendSpacing(
  option: Record<string, unknown>,
  isPie: boolean
): Record<string, unknown> {
  const legend = option.legend as Record<string, unknown> | undefined;
  const next = { ...option };
  (next as Record<string, unknown>).legend = isPie
    ? {
        ...(legend && typeof legend === "object" ? legend : {}),
        show: true,
        right: 16,
        top: "center",
        orient: "vertical",
        left: undefined,
        bottom: undefined,
        textStyle: { fontSize: 12, color: "#64748b" },
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 16,
      }
    : {
        ...(legend && typeof legend === "object" ? legend : {}),
        show: true,
        bottom: LEGEND_BOTTOM_GAP,
        left: "center",
        top: undefined,
        orient: "horizontal",
        textStyle: { fontSize: 12, color: "#64748b" },
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 24,
      };
  if (!isPie) {
    const grid = option.grid as Record<string, unknown> | undefined;
    (next as Record<string, unknown>).grid = {
      ...(grid && typeof grid === "object" ? grid : {}),
      top: CARTESIAN_GRID_TOP,
      bottom: CARTESIAN_GRID_BOTTOM,
    };
  } else {
    const series = next.series as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(series) && series[0]?.type === "pie") {
      const pie = series[0];
      const radius = pie.radius ?? ["40%", "70%"];
      const center: [string, string] = [PIE_CENTER_X_WHEN_LEGEND_RIGHT, PIE_CENTER_Y];
      (next as Record<string, unknown>).series = [
        { ...pie, radius, center },
        ...series.slice(1),
      ];
    }
  }
  return next;
}

/** 直角坐标系图表（折线、柱状、条形）的默认配置 */
const REPORT_CHART_BASE_OPTION: Record<string, unknown> = {
  grid: {
    left: 56,
    right: 32,
    top: CARTESIAN_GRID_TOP,
    bottom: CARTESIAN_GRID_BOTTOM,
    containLabel: false,
  },
  legend: {
    show: true,
    bottom: LEGEND_BOTTOM_GAP,
    left: "center",
    top: undefined,
    orient: "horizontal",
    textStyle: { fontSize: 12, color: "#64748b" },
    itemWidth: 14,
    itemHeight: 10,
    itemGap: 24,
  },
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: [12, 16],
    textStyle: { fontSize: 12, color: "#334155", fontWeight: 500 },
    confine: true,
    axisPointer: {
      type: "line",
      lineStyle: { color: "#e2e8f0", type: "dashed" },
    },
  },
  xAxis: {
    type: "category",
    axisLine: { lineStyle: { color: "#e2e8f0", width: 1 } },
    axisTick: { show: false },
    axisLabel: { color: "#64748b", fontSize: 11, margin: 10 },
    splitLine: { show: false },
    boundaryGap: true,
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#64748b", fontSize: 11, margin: 8 },
    splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed", width: 1 } },
  },
};

/** 饼图专用默认配置（无 xAxis/yAxis） */
const REPORT_PIE_BASE_OPTION: Record<string, unknown> = {
  tooltip: {
    trigger: "item",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 8,
    padding: [12, 16],
    textStyle: { fontSize: 12, color: "#334155", fontWeight: 500 },
    confine: true,
    formatter: "{b}: {c} ({d}%)",
    extraCssText: "box-shadow: 0 4px 12px rgba(0,0,0,0.08);",
  },
  legend: {
    right: 16,
    top: "center",
    orient: "vertical",
    textStyle: { fontSize: 12, color: "#64748b" },
    itemWidth: 14,
    itemHeight: 10,
    itemGap: 16,
    itemStyle: { borderWidth: 0 },
    pageIconColor: "#94a3b8",
    pageTextStyle: { color: "#64748b", fontSize: 11 },
  },
};

/** 饼图配色（与主题/条形图一致） */
const PIE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#84cc16",
];

/** 为饼图系列统一配色与标签样式 */
function enhancePieChartOption(
  option: Record<string, unknown>
): Record<string, unknown> {
  const series = option.series as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(series) || series[0]?.type !== "pie") return option;
  const pie = series[0];
  const out = { ...option };
  (out as Record<string, unknown>).series = [
    {
      ...pie,
      color: pie.color ?? PIE_COLORS,
      radius: pie.radius ?? ["42%", "72%"],
      center: pie.center ?? ["50%", "48%"],
      avoidLabelOverlap: pie.avoidLabelOverlap ?? true,
      selectedOffset: pie.selectedOffset ?? 6,
      label: {
        show: true,
        fontSize: 12,
        color: "#475569",
        formatter:
          (typeof pie.label === "object" &&
          pie.label &&
          "formatter" in pie.label
            ? (pie.label as { formatter?: string }).formatter
            : undefined) ?? "{b}\n{d}%",
        position: "outside",
        minMargin: 6,
        overflow: "truncate",
        width: 72,
        ...(typeof pie.label === "object" && pie.label ? pie.label : {}),
      },
      labelLine: {
        show: true,
        length: 14,
        length2: 10,
        smooth: true,
        lineStyle: { color: "#cbd5e1", width: 1 },
        ...(typeof pie.labelLine === "object" && pie.labelLine
          ? pie.labelLine
          : {}),
      },
      itemStyle: {
        borderColor: "#fff",
        borderWidth: 2,
        shadowBlur: 8,
        shadowColor: "rgba(0,0,0,0.08)",
        shadowOffsetY: 2,
        ...(typeof pie.itemStyle === "object" && pie.itemStyle
          ? pie.itemStyle
          : {}),
      },
      emphasis: {
        scale: true,
        scaleSize: 6,
        itemStyle: {
          shadowBlur: 14,
          shadowColor: "rgba(0,0,0,0.14)",
          borderWidth: 2,
        },
        label: { show: true, fontWeight: 600 },
        labelLine: { show: true },
        ...(typeof pie.emphasis === "object" && pie.emphasis
          ? pie.emphasis
          : {}),
      },
    },
    ...series.slice(1),
  ];
  return out;
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...base };
  for (const key of Object.keys(override)) {
    const b = out[key];
    const o = override[key];
    if (
      o != null &&
      typeof o === "object" &&
      !Array.isArray(o) &&
      typeof b === "object" &&
      b != null &&
      !Array.isArray(b)
    ) {
      (out as Record<string, unknown>)[key] = deepMerge(
        b as Record<string, unknown>,
        o as Record<string, unknown>
      );
    } else if (o !== undefined) {
      (out as Record<string, unknown>)[key] = o;
    }
  }
  return out;
}

const THEME_NAME = "reportChartTheme";

export function ReportHtmlContent({ contentHtml }: ReportHtmlContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstancesRef = useRef<echarts.ECharts[]>([]);

  const sanitized = DOMPurify.sanitize(contentHtml, {
    ALLOWED_TAGS,
    ADD_ATTR,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      echarts.registerTheme(THEME_NAME, REPORT_CHART_THEME);
    } catch {
      // 已注册则忽略
    }

    const container = containerRef.current;
    if (!container) return;

    // 指标卡标签：去掉末尾「万」，单位只在数值中展示（如「播放量万」→「播放量」）
    container.querySelectorAll(".report-metric-label").forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.endsWith("万")) {
        el.textContent = text.slice(0, -1);
      }
    });

    const chartEls = container.querySelectorAll<HTMLDivElement>(
      "[data-echarts-option]"
    );
    const instances: echarts.ECharts[] = [];

    chartEls.forEach((el) => {
      const raw = el.getAttribute("data-echarts-option");
      if (!raw?.trim()) return;
      try {
        const userOption = JSON.parse(raw) as Record<string, unknown>;
        const series = userOption.series as
          | Array<{ type?: string }>
          | undefined;
        const isPie =
          Array.isArray(series) &&
          series.length > 0 &&
          series[0]?.type === "pie";
        const baseOption = isPie
          ? REPORT_PIE_BASE_OPTION
          : REPORT_CHART_BASE_OPTION;
        let merged = deepMerge(baseOption, userOption) as Record<
          string,
          unknown
        >;
        if (isPie) {
          merged = enhancePieChartOption(merged);
        } else if (Array.isArray(merged.series)) {
          const seriesList = merged.series as Array<{ type?: string }>;
          if (seriesList.some((s) => s?.type === "line"))
            merged = enhanceLineChartOption(merged);
          if (seriesList.some((s) => s?.type === "bar"))
            merged = enhanceBarChartOption(merged);
        }
        merged = applyLegendSpacing(merged, isPie);
        const chart = echarts.init(el, THEME_NAME);
        chart.setOption(merged as Parameters<echarts.ECharts["setOption"]>[0]);
        instances.push(chart);
      } catch (err) {
        console.warn("[ReportHtmlContent] ECharts option 解析或渲染失败:", err);
      }
    });

    chartInstancesRef.current = instances;

    const onResize = () => instances.forEach((chart) => chart.resize());
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      instances.forEach((chart) => chart.dispose());
      chartInstancesRef.current = [];
    };
  }, [contentHtml]);

  return (
    <div
      ref={containerRef}
      className="report-html-content mt-6"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
