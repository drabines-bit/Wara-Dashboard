import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "github" && profile) {
        token.login = profile.login;
      }
      return token;
    },
    async session({ session, token }) {
      const adminEmails =
        process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
      session.user.role = adminEmails.includes(session.user.email)
        ? "admin"
        : "viewer";
      if (token?.login) {
        session.user.login = token.login;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
