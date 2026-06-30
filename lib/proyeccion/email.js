import { Resend } from "resend";
import { fmtCurrency } from "@/lib/format";

const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function labelMes(mes) {
  if (!mes) return "";
  const [y, m] = mes.split("-").map(Number);
  return `${MESES_ABR[m - 1]} '${String(y).slice(2)}`;
}

export async function enviarReporteProyeccion({ pdfBase64, mesCorrida, resultadoAlCierre, cajaAcumulada18m }) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no configurada");
  const to = (process.env.PROYECCION_REPORT_TO ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (to.length === 0) throw new Error("PROYECCION_REPORT_TO no configurada");
  if (!pdfBase64) throw new Error("Falta pdfBase64");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.REPORT_FROM_EMAIL ?? "onboarding@resend.dev";
  const mesLabel = labelMes(mesCorrida);
  const asunto = `Proyección WARA — ${mesLabel}`;

  await resend.emails.send({
    from,
    to,
    subject: asunto,
    html: `
      <div style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;">
        <div style="background:#1e1b4b;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">Proyección Financiera · Wara GPS</h1>
          <p style="color:#a5b4fc;margin:6px 0 0;font-size:14px;">Blo, Bienestar, Logística y Organización S.A.</p>
        </div>
        <div style="background:#f8fafc;padding:24px 32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
          <p style="margin:0 0 12px;">Corrida de proyección a 18 meses, desde <strong>${mesLabel}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
            <tr>
              <td style="padding:10px 0;color:#64748b;font-size:13px;">Resultado proyectado al próximo 31-dic</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;">${fmtCurrency(resultadoAlCierre)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;font-size:13px;">Caja operativa acumulada (18 m)</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;">${fmtCurrency(cajaAcumulada18m)}</td>
            </tr>
          </table>
          <p style="color:#64748b;font-size:13px;margin:0 0 24px;">Se adjunta el reporte completo en PDF.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;"/>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Wara GPS · Business Intelligence &amp; Finance</p>
        </div>
      </div>
    `,
    attachments: [{
      filename: `proyeccion-wara-gps-${mesCorrida ?? "reporte"}.pdf`,
      content: Buffer.from(pdfBase64, "base64"),
    }],
  });
}
