import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    // Login principal: Google Workspace de waragps.com (y cuentas externas
    // autorizadas por email). El selector de cuenta se fuerza para evitar
    // que entre solo con la última sesión de Google abierta.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: "select_account" } },
    }),
    // GitHub se mantiene como alternativa durante la transición a Google.
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
