import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAllowed } from "@/lib/escaner-iva-config";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user && isAllowed(session.user.login)) {
    redirect("/escaner-iva");
  }
  return <LoginClient />;
}
