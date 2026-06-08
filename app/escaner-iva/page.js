import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import EscanerClient from "./EscanerClient";

export default async function EscanerPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name ?? "Usuario";
  const userImage = session?.user?.image ?? "";
  const userLogin = session?.user?.login ?? "";

  return <EscanerClient userName={userName} userImage={userImage} userLogin={userLogin} />;
}
