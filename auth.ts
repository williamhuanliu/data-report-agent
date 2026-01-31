import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.password !== 'string') return null;
        const email = String(credentials.email).trim().toLowerCase();
        const password = credentials.password;

        // 演示：允许任意邮箱 + 密码 demo123 登录；生产环境请接入真实用户库
        const demoPassword = process.env.AUTH_DEMO_PASSWORD ?? 'demo123';
        if (password !== demoPassword) return null;

        return {
          id: `user-${email.replace(/[^a-z0-9]/gi, '-')}`,
          email,
          name: email.split('@')[0],
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
