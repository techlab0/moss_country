import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { NextAuthOptions } from 'next-auth';
import { findUserByEmail, updateUser } from '@/lib/userManager';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 管理者ユーザーかチェック
      const adminUser = findUserByEmail(user.email!);
      if (!adminUser) {
        return false; // 管理者ユーザーでない場合は拒否
      }

      // Google IDを保存
      if (account?.provider === 'google') {
        updateUser(adminUser.id, {
          googleId: account.providerAccountId,
          twoFactorMethod: 'google',
          twoFactorEnabled: true,
        });
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const adminUser = findUserByEmail(user.email!);
        if (adminUser) {
          token.userId = adminUser.id;
          token.role = adminUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };