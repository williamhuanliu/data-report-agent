'use client';

/**
 * 合作伙伴区 Logo 配图：5 个抽象品牌风格图标。
 */
const logos = [
  {
    label: 'Partner A',
    svg: (
      <svg viewBox="0 0 96 40" fill="none" className="w-full h-10" aria-hidden>
        <rect x="0" y="8" width="24" height="24" rx="6" fill="var(--color-primary)" fillOpacity="0.15" />
        <path d="M8 20h8M12 16v8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Partner B',
    svg: (
      <svg viewBox="0 0 96 40" fill="none" className="w-full h-10" aria-hidden>
        <circle cx="20" cy="20" r="12" fill="var(--foreground)" fillOpacity="0.08" stroke="var(--border)" strokeWidth="1.5" />
        <path d="M14 20l4 4 8-8" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Partner C',
    svg: (
      <svg viewBox="0 0 96 40" fill="none" className="w-full h-10" aria-hidden>
        <path d="M8 28V12l6 8 6-8 6 16" stroke="var(--foreground)" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 12h8l-4 16h-8" fill="var(--color-primary)" fillOpacity="0.2" />
      </svg>
    ),
  },
  {
    label: 'Partner D',
    svg: (
      <svg viewBox="0 0 96 40" fill="none" className="w-full h-10" aria-hidden>
        <rect x="4" y="4" width="32" height="32" rx="4" fill="none" stroke="var(--border)" strokeWidth="1.5" />
        <path d="M12 20h16M20 12v16" stroke="var(--color-gradient-end)" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Partner E',
    svg: (
      <svg viewBox="0 0 96 40" fill="none" className="w-full h-10" aria-hidden>
        <polygon points="20,8 28,32 12,32" fill="var(--color-primary)" fillOpacity="0.2" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="32" cy="20" r="10" fill="none" stroke="var(--foreground)" strokeOpacity="0.2" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export function PartnerLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70">
      {logos.map(({ label, svg }, i) => (
        <div key={i} className="h-10 w-24 flex items-center justify-center text-[var(--foreground)]" title={label}>
          {svg}
        </div>
      ))}
    </div>
  );
}
