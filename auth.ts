import NextAuth from 'next-auth';
import Credentials from '@auth/core/providers/credentials';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Admin Access',
      credentials: {
        password: { label: 'Admin Password', type: 'password' },
      },
      async authorize(credentials) {
        const adminPassword =
          process.env.ADMIN_PASSWORD || 'clawmore-admin-2026';
        const isCorrectPassword = credentials?.password === adminPassword;

        // Hard-coded restriction to specific admin email
        if (isCorrectPassword) {
          return {
            id: 'admin-001',
            name: 'Cao Peng',
            email: 'caopengau@gmail.com',
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminEmail = auth?.user?.email === 'caopengau@gmail.com';
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');

      if (isOnAdmin) {
        // Must be logged in AND have the specific admin email
        if (isLoggedIn && isAdminEmail) return true;
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
});
