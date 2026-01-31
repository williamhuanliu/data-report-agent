import Link from "next/link";
import { AppHeader } from "./components/layout/AppHeader";
import { AppFooter } from "./components/layout/AppFooter";
import { Card } from "./components/ui";
import { HeroIllustration } from "./components/home/HeroIllustration";
import { ProductSectionIllustration } from "./components/home/ProductSectionIllustration";
import { PartnerLogos } from "./components/home/PartnerLogos";
import { RedirectIfAuthenticated } from "./components/RedirectIfAuthenticated";

export default function Home() {
  return (
    <RedirectIfAuthenticated>
      <div
        className="min-h-screen flex flex-col bg-[var(--background)]"
        id="main"
      >
        <AppHeader />

        <main className="flex-1 w-full">
          {/* Hero */}
          <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 sm:pt-16 pb-16 sm:pb-20 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--foreground)] mb-4 text-heading">
              让数据自己讲故事
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
              上传 Excel/CSV 或描述你的想法，AI
              自动生成可分享的数据报告，几秒内得到结论。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--foreground)] px-6 text-base font-medium text-[var(--surface)] hover:opacity-90 transition-opacity"
              >
                免费开始
              </Link>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 text-base font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                观看演示
              </button>
            </div>
            <div className="mt-12 max-w-4xl mx-auto">
              <HeroIllustration />
            </div>
          </section>

          {/* Product cards */}
          <section
            id="product"
            className="max-w-6xl mx-auto px-4 sm:px-8 py-16 border-t border-[var(--border)]"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-8 text-center">
              产品能力
            </h2>
            <ProductSectionIllustration />
            <div className="grid sm:grid-cols-3 gap-6">
              <Card className="p-6 rounded-[var(--radius-xl)] border border-[var(--border)] hover:border-[var(--color-primary)]/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white mb-4">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  周报 / 月报
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  基于上传数据一键生成周期报告，节省重复劳动。
                </p>
              </Card>
              <Card className="p-6 rounded-[var(--radius-xl)] border border-[var(--border)] hover:border-[var(--color-primary)]/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white mb-4">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  分析报告
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  AI 提炼关键指标与洞察，给出可操作建议。
                </p>
              </Card>
              <Card className="p-6 rounded-[var(--radius-xl)] border border-[var(--border)] hover:border-[var(--color-primary)]/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white mb-4">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  可分享链接
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  生成 H5 报告页，分享链接或导出 PDF。
                </p>
              </Card>
            </div>
          </section>

          {/* Your next big idea */}
          <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 border-t border-[var(--border)] text-center">
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-8">
              与优秀团队一起用好数据
            </h2>
            <PartnerLogos />
          </section>

          {/* Three pillars: Generate / Shape / Share */}
          <section
            id="solutions"
            className="max-w-6xl mx-auto px-4 sm:px-8 py-16 border-t border-[var(--border)]"
          >
            <div className="grid sm:grid-cols-3 gap-10">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
                  生成
                </h3>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  <li>· 描述想法或上传数据，一键生成报告</li>
                  <li>· 支持仅文字描述，无需表格也能出报告</li>
                  <li>· 自动提炼指标、洞察与建议</li>
                </ul>
                <Link
                  href="/create"
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  免费开始
                </Link>
              </div>
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4">
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
                  打磨
                </h3>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  <li>· 预览大纲，调整报告结构</li>
                  <li>· 选择主题风格，定制报告外观</li>
                  <li>· 生成后可用 AI 编辑各章节</li>
                </ul>
                <Link
                  href="/create"
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  免费开始
                </Link>
              </div>
              <div>
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4">
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
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
                  分享
                </h3>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  <li>· 分享报告链接，他人直接打开</li>
                  <li>· 导出 PDF / 打印</li>
                  <li>· 无需登录即可查看</li>
                </ul>
                <Link
                  href="/create"
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  免费开始
                </Link>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section
            id="about"
            className="max-w-6xl mx-auto px-4 sm:px-8 py-16 border-t border-[var(--border)]"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-8 text-center">
              加入万千用户，用 AI 写报告
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  quote: "再也不用每周手工做周报了，上传数据几分钟就出报告。",
                  name: "张明",
                  role: "运营负责人",
                },
                {
                  quote: "结论写得很像真人分析师，老板直接拿来汇报。",
                  name: "李华",
                  role: "数据分析师",
                },
                {
                  quote: "分享链接给客户看，专业又省事。",
                  name: "王芳",
                  role: "销售经理",
                },
              ].map((t, i) => (
                <Card
                  key={i}
                  className="p-6 rounded-[var(--radius-xl)] border border-[var(--border)]"
                >
                  <p className="text-[var(--foreground)] mb-4">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="font-medium text-[var(--foreground)]">
                    {t.name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t.role}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 border-t border-[var(--border)] text-center">
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
              好想法，值得被看见
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8">
              用数据讲故事，从免费开始
            </p>
            <Link
              href="/create"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--foreground)] px-8 text-base font-medium text-[var(--surface)] hover:opacity-90 transition-opacity"
            >
              免费开始
            </Link>
          </section>
        </main>

        <AppFooter />
      </div>
    </RedirectIfAuthenticated>
  );
}
