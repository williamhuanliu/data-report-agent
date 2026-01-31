'use client';

/**
 * 产品能力区配图：周报 / 分析 / 分享 三块示意。
 */
export function ProductSectionIllustration() {
  return (
    <div className="flex justify-center gap-4 sm:gap-6 mb-10">
      <svg
        viewBox="0 0 320 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-md h-auto text-[var(--foreground)]"
        aria-hidden
      >
        {/* 周报卡片 */}
        <g transform="translate(0, 0)">
          <rect width="96" height="96" rx="12" fill="var(--surface-elevated)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="16" y="16" width="32" height="32" rx="8" fill="var(--color-primary)" fillOpacity="0.2" />
          <path d="M28 28v16h16V28" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="16" y="56" width="64" height="6" rx="3" fill="var(--foreground)" fillOpacity="0.1" />
          <rect x="16" y="68" width="48" height="6" rx="3" fill="var(--foreground)" fillOpacity="0.08" />
        </g>
        {/* 分析图表卡片 */}
        <g transform="translate(112, 0)">
          <rect width="96" height="96" rx="12" fill="var(--surface-elevated)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="16" y="16" width="32" height="32" rx="8" fill="var(--color-gradient-end)" fillOpacity="0.2" />
          <path d="M28 38L36 30L44 34L52 26L60 32" stroke="var(--color-gradient-end)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="16" y="56" width="20" height="24" rx="4" fill="var(--color-primary)" fillOpacity="0.5" />
          <rect x="40" y="44" width="20" height="36" rx="4" fill="var(--color-primary)" />
          <rect x="64" y="52" width="20" height="28" rx="4" fill="var(--color-gradient-end)" fillOpacity="0.6" />
        </g>
        {/* 分享链接卡片 */}
        <g transform="translate(224, 0)">
          <rect width="96" height="96" rx="12" fill="var(--surface-elevated)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="16" y="16" width="32" height="32" rx="8" fill="var(--color-primary)" fillOpacity="0.15" />
          <path d="M28 28l8 8-8 8M36 28l8 8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="16" y="56" width="64" height="8" rx="4" fill="var(--foreground)" fillOpacity="0.08" />
          <circle cx="36" cy="60" r="4" fill="var(--color-primary)" fillOpacity="0.4" />
          <rect x="48" y="58" width="28" height="4" rx="2" fill="var(--foreground)" fillOpacity="0.12" />
        </g>
      </svg>
    </div>
  );
}
