import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';
import { Resend }           from 'resend';

export async function POST(req) {
  let session;
  try { session = await getServerSession(); } catch {}
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim()).filter(Boolean);
  if (!adminEmails.includes(session.user?.email ?? ''))
    return NextResponse.json({ error: 'Solo administradores pueden enviar reportes' }, { status: 403 });

  if (!process.env.RESEND_API_KEY)
    return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 });
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { to, pdfBase64, mes, year } = await req.json();

  if (!to?.trim() || !pdfBase64)
    return NextResponse.json({ error: 'Faltan parámetros: to y pdfBase64' }, { status: 400 });

  const pdfBuffer = Buffer.from(pdfBase64, 'base64');

  const from   = process.env.REPORT_FROM_EMAIL ?? 'onboarding@resend.dev';
  const asunto = `Reporte Financiero Wara GPS · ${mes ?? ''} ${year ?? ''}`.trim();

  try {
    await resend.emails.send({
      from,
      to: [to.trim()],
      subject: asunto,
      html: `
        <div style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:0 auto;">
          <div style="background:#1e1b4b;padding:24px 32px;border-radius:8px 8px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">
              Dashboard Financiero · Wara GPS
            </h1>
            <p style="color:#a5b4fc;margin:6px 0 0;font-size:14px;">
              Blo, Bienestar, Logística y Organización S.A.
            </p>
          </div>
          <div style="background:#f8fafc;padding:24px 32px;border-radius:0 0 8px 8px;
                      border:1px solid #e2e8f0;border-top:none;">
            <p style="margin:0 0 12px;">
              Se adjunta el reporte financiero correspondiente al período
              <strong>${mes ?? ''} ${year ?? ''}</strong>.
            </p>
            <p style="color:#64748b;font-size:13px;margin:0 0 24px;">
              Este reporte fue generado automáticamente desde el dashboard
              financiero de Wara GPS.
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;"/>
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              Wara GPS · Business Intelligence & Finance
            </p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `reporte-wara-gps-${(mes ?? 'reporte').toLowerCase().replace(/ /g,'-')}-${year ?? ''}.pdf`,
        content:  pdfBuffer,
      }],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-report]', err);
    return NextResponse.json(
      { error: err.message ?? 'Error al enviar el email' },
      { status: 500 }
    );
  }
}
