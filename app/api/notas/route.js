import { NextResponse }    from 'next/server';
import { getServerSession } from 'next-auth';
import { getNotas, setNota } from '@/lib/kv';

// GET /api/notas?year=2026
export async function GET(req) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const year  = new URL(req.url).searchParams.get('year') || new Date().getFullYear();
  const notas = await getNotas(year);
  return NextResponse.json({ notas });
}

// PUT /api/notas  { year, mes, texto }
export async function PUT(req) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
  if (!adminEmails.includes(session.user?.email)) {
    return NextResponse.json({ error: 'Solo administradores pueden editar notas' }, { status: 403 });
  }

  const { year, mes, texto } = await req.json();
  if (year === undefined || mes === undefined) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }
  if (texto && texto.length > 600) {
    return NextResponse.json({ error: 'La nota no puede superar los 600 caracteres' }, { status: 400 });
  }

  const ok = await setNota(year, mes, texto);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
}
