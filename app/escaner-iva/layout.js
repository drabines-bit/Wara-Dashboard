import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAllowed } from "@/lib/escaner-iva-config";

export const metadata = { title: "Escáner IVA Compras — Wara GPS" };

export default async function EscanerLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/escaner-iva/login");
  }

  if (!isAllowed(session.user.login)) {
    redirect("/escaner-iva/unauthorized");
  }

  return <>{children}</>;
}
