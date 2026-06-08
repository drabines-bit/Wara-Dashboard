import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAllowed } from "@/lib/escaner-iva-config";
import EscanerClient from "./EscanerClient";

export default async function EscanerPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/escaner-iva/login");
  }

  const login = session.user?.login ?? "";
  if (!isAllowed(login)) {
    redirect("/escaner-iva/unauthorized");
  }

  return (
    <EscanerClient
      userName={session.user?.name ?? "Usuario"}
      userImage={session.user?.image ?? ""}
      userLogin={login}
    />
  );
}
