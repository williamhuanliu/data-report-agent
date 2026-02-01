'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '../components/layout/AppHeader';
import { AppFooter } from '../components/layout/AppFooter';
import { Button } from '../components/ui';
import { Input } from '../components/ui/Input';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    error === 'CredentialsSignin' ? { type: 'error', text: '邮箱或密码错误，请重试。' } : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setMessage({ type: 'error', text: '邮箱或密码错误，请重试。' });
        return;
      }
      if (result?.ok) {
        window.location.href = callbackUrl;
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-foreground mb-2 text-center">登录</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 text-center">
            使用邮箱登录（演示：密码为 demo123）
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              name="email"
              label="邮箱"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              name="password"
              label="密码"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {message && (
              <p
                className={`text-sm ${
                  message.type === 'error' ? 'text-error' : 'text-success'
                }`}
              >
                {message.text}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="text-primary hover:underline">
              返回首页
            </Link>
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm text-center text-zinc-500 dark:text-zinc-400">加载中…</div>
        </main>
        <AppFooter />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
