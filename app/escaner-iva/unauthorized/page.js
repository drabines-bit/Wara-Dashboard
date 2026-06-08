import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function UnauthorizedPage() {
  const session = await getServerSession(authOptions);
  const login = session?.user?.login ?? "desconocido";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#FCF0F3",
          border: "0.5px solid #F0C0CC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 24,
        }}>
          🔒
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: "0 0 8px" }}>
          Acceso no autorizado
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
          El usuario <strong>@{login}</strong> no tiene acceso a esta herramienta.
          <br />
          Contactá al administrador de Wara GPS.
        </p>
        <Link href="/" style={{ fontSize: 13, color: "#8B0028", textDecoration: "underline" }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
