import { NextResponse } from 'next/server';

// 不在 middleware 中调用 auth()，避免 Edge 下导致白屏；登录用户进首页的跳转在首页用客户端重定向实现
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
