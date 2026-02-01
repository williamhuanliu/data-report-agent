"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function useThemeSafe() {
  const context = useContext(ThemeContext);
  return context;
}

export function ThemeToggle() {
  const context = useThemeSafe();
  const [localTheme, setLocalTheme] = useState<Theme>("system");
  const [localResolved, setLocalResolved] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer all setState to timer callback so effect doesn't trigger cascading renders
    const id = setTimeout(() => {
      setMounted(true);
      if (!context) {
        const stored = localStorage.getItem("data-report-theme") as Theme | null;
        if (stored && ["light", "dark", "system"].includes(stored)) {
          setLocalTheme(stored);
        }
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setLocalResolved(
          stored === "dark"
            ? "dark"
            : stored === "light"
            ? "light"
            : isDark
            ? "dark"
            : "light"
        );
      }
    }, 0);
    return () => clearTimeout(id);
  }, [context]);

  const theme = context?.theme ?? localTheme;
  const resolvedTheme = context?.resolvedTheme ?? localResolved;
  const setTheme =
    context?.setTheme ??
    ((t: Theme) => {
      setLocalTheme(t);
      localStorage.setItem("data-report-theme", t);
      const resolved =
        t === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : t;
      setLocalResolved(resolved);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
    });

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getIcon = () => {
    if (theme === "system") {
      return (
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
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    }
    if (resolvedTheme === "dark") {
      return (
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
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      );
    }
    return (
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
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    );
  };

  const getLabel = () => {
    if (theme === "system") return "跟随系统";
    if (theme === "dark") return "深色模式";
    return "浅色模式";
  };

  // Don't render anything during SSR to avoid hydration mismatch
  if (!mounted) {
    return <div className="w-9 h-9" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex items-center gap-2 h-9 px-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-foreground rounded-lg hover:bg-surface-elevated transition-colors"
      title={getLabel()}
      aria-label={`当前：${getLabel()}，点击切换`}
    >
      {getIcon()}
      <span className="hidden sm:inline">{getLabel()}</span>
    </button>
  );
}
