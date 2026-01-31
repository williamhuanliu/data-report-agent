import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./components/ThemeProvider";
import { SessionProvider } from "./components/auth/SessionProvider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 数据报告生成器 | 一键生成专业数据分析报告",
  description:
    "上传 Excel 或 CSV 数据，AI 自动分析并生成可分享的数据报告。支持 OpenAI、Claude、OpenRouter，让数据分析更简单。",
  openGraph: {
    title: "AI 数据报告生成器 | 一键生成专业数据分析报告",
    description:
      "上传 Excel 或 CSV 数据，AI 自动分析并生成可分享的数据报告。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 数据报告生成器",
    description: "上传数据，AI 自动生成专业分析报告。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('data-report-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
