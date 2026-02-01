'use client';

/**
 * Hero 主视觉：数据报告 / 仪表盘风格插画，适配明暗主题。
 */
export function HeroIllustration() {
  return (
    <div className="w-full aspect-video rounded-2xl border border-border bg-surface-elevated overflow-hidden flex items-center justify-center p-6 sm:p-10">
      <svg
        viewBox="0 0 640 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-h-[320px] object-contain"
        aria-hidden
      >
        {/* 背景网格 */}
        <g stroke="var(--border)" strokeOpacity="0.4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <line key={`h${i}`} x1={0} y1={i * 45} x2={640} y2={i * 45} />
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <line key={`v${i}`} x1={i * 64} y1={0} x2={i * 64} y2={360} />
          ))}
        </g>

        {/* 左侧「报告」卡片 */}
        <g transform="translate(48, 80)">
          <rect width="200" height="200" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="20" y="20" width="80" height="12" rx="4" fill="var(--color-primary)" fillOpacity="0.2" />
          <rect x="20" y="44" width="160" height="8" rx="4" fill="var(--foreground)" fillOpacity="0.08" />
          <rect x="20" y="60" width="120" height="8" rx="4" fill="var(--foreground)" fillOpacity="0.08" />
          <rect x="20" y="88" width="160" height="60" rx="8" fill="var(--color-primary)" fillOpacity="0.12" />
          {/* 迷你柱状图 */}
          <rect x="36" y="128" width="16" height="40" rx="4" fill="var(--color-primary)" fillOpacity="0.6" />
          <rect x="60" y="108" width="16" height="60" rx="4" fill="var(--color-primary)" />
          <rect x="84" y="118" width="16" height="50" rx="4" fill="var(--color-primary)" fillOpacity="0.7" />
          <rect x="108" y="98" width="16" height="70" rx="4" fill="var(--color-gradient-end)" fillOpacity="0.8" />
          <rect x="132" y="108" width="16" height="60" rx="4" fill="var(--color-primary)" fillOpacity="0.5" />
        </g>

        {/* 右侧「图表」区域 */}
        <g transform="translate(280, 60)">
          <rect width="312" height="240" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="24" y="20" width="120" height="10" rx="4" fill="var(--foreground)" fillOpacity="0.15" />
          {/* 折线图 */}
          <path
            d="M 48 180 L 120 140 L 192 120 L 264 160 L 336 100 L 408 80 L 480 130"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M 48 200 L 120 170 L 192 190 L 264 200 L 336 180 L 408 200 L 480 190"
            stroke="var(--color-gradient-end)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.9"
          />
          {/* 图例 */}
          <circle cx="380" cy="28" r="5" fill="var(--color-primary)" />
          <rect x="392" y="23" width="24" height="10" rx="2" fill="var(--foreground)" fillOpacity="0.1" />
          <circle cx="450" cy="28" r="5" fill="var(--color-gradient-end)" />
          <rect x="462" y="23" width="24" height="10" rx="2" fill="var(--foreground)" fillOpacity="0.1" />
        </g>

        {/* 底部「数据输入」示意 */}
        <g transform="translate(48, 300)">
          <rect width="544" height="44" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
          <rect x="16" y="12" width="200" height="20" rx="6" fill="var(--foreground)" fillOpacity="0.06" />
          <rect x="230" y="12" width="80" height="20" rx="6" fill="var(--color-primary)" fillOpacity="0.2" />
          <rect x="322" y="12" width="80" height="20" rx="6" fill="var(--color-primary)" fillOpacity="0.15" />
          <rect x="414" y="12" width="120" height="20" rx="6" fill="var(--color-primary)" />
        </g>
      </svg>
    </div>
  );
}
