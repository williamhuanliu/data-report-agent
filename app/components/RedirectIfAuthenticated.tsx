"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * 已登录用户访问首页时重定向到 /dashboard，避免依赖 middleware 中的 auth（Edge 下易白屏）
 */
export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  if (status === "authenticated" && session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-zinc-500 dark:text-zinc-400">正在跳转到工作台…</p>
      </div>
    );
  }

  return <>{children}</>;
}
