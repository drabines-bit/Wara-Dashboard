"use client";
import { signIn } from "next-auth/react";

export default function LoginClient() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#fff",
        border: "0.5px solid #e2e8f0",
        borderRadius: 16,
        padding: "48px 40px",
        textAlign: "center",
        maxWidth: 400,
        width: "100%",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <img
          src="/logo_wara.svg"
          alt="Wara GPS"
          style={{ height: 40, marginBottom: 24, objectFit: "contain" }}
        />
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#0f172a", margin: "0 0 8px" }}>
          Escáner IVA Compras
        </h1>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 32 }}>
          Blo, Bienestar, Logística y Organización S.A.
          <br />
          <span style={{ color: "#94a3b8" }}>Acceso exclusivo equipo Wara GPS</span>
        </p>
        <button
          onClick={() => signIn("github", { callbackUrl: "/escaner-iva" })}
          style={{
            width: "100%",
            padding: "11px 20px",
            borderRadius: 8,
            border: "none",
            background: "#8B0028",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Iniciar sesión con GitHub
        </button>
      </div>
    </div>
  );
}
