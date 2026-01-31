// 报告主题系统

export interface ReportTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    gradientStart: string;
    gradientEnd: string;
  };
}

export const REPORT_THEMES: ReportTheme[] = [
  {
    id: 'business',
    name: '商务蓝',
    description: '专业蓝色调，适合正式商务场景',
    colors: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceElevated: '#f1f5f9',
      border: '#e2e8f0',
      text: '#0f172a',
      textMuted: '#64748b',
      accent: '#3b82f6',
      gradientStart: '#2563eb',
      gradientEnd: '#7c3aed',
    },
  },
  {
    id: 'minimal',
    name: '简约灰',
    description: '黑白灰简洁风格，清晰专业',
    colors: {
      primary: '#18181b',
      primaryHover: '#27272a',
      background: '#ffffff',
      surface: '#fafafa',
      surfaceElevated: '#f4f4f5',
      border: '#e4e4e7',
      text: '#09090b',
      textMuted: '#71717a',
      accent: '#52525b',
      gradientStart: '#18181b',
      gradientEnd: '#3f3f46',
    },
  },
  {
    id: 'dark',
    name: '暗夜',
    description: '深色背景，适合暗色模式',
    colors: {
      primary: '#a78bfa',
      primaryHover: '#c4b5fd',
      background: '#0a0a0a',
      surface: '#171717',
      surfaceElevated: '#262626',
      border: '#404040',
      text: '#fafafa',
      textMuted: '#a3a3a3',
      accent: '#8b5cf6',
      gradientStart: '#7c3aed',
      gradientEnd: '#c026d3',
    },
  },
];

export function getThemeById(id: string): ReportTheme {
  return REPORT_THEMES.find((t) => t.id === id) || REPORT_THEMES[0];
}

export function getThemeCSSVariables(theme: ReportTheme): Record<string, string> {
  return {
    '--theme-primary': theme.colors.primary,
    '--theme-primary-hover': theme.colors.primaryHover,
    '--theme-background': theme.colors.background,
    '--theme-surface': theme.colors.surface,
    '--theme-surface-elevated': theme.colors.surfaceElevated,
    '--theme-border': theme.colors.border,
    '--theme-text': theme.colors.text,
    '--theme-text-muted': theme.colors.textMuted,
    '--theme-accent': theme.colors.accent,
    '--theme-gradient-start': theme.colors.gradientStart,
    '--theme-gradient-end': theme.colors.gradientEnd,
  };
}
