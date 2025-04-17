import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from './src/lib/prisma';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      if (token?.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          } else {
            console.warn(
              `[Auth JWT Callback] User ${token.id} not found in DB.`
            );
          }
        } catch (error) {
          console.error(
            '[Auth JWT Callback] Error refreshing user role:',
            error
          );
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id;
      }
      if (token?.role && session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
});
