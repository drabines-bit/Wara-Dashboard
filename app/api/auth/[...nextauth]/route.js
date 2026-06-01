import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async session({ session }) {
      const adminEmails = process.env.ADMIN_EMAILS
        ?.split(",")
        .map((e) => e.trim()) || [];
      session.user.role = adminEmails.includes(session.user.email)
        ? "admin"
        : "viewer";
      return session;
    },
  },
  pages: { signIn: "/login" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
