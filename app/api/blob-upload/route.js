import { handleUpload } from '@vercel/blob/client';
import { NextResponse }  from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(req) {
  let session;
  try { session = await getServerSession(); } catch {}
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: 30 * 1024 * 1024, // 30 MB
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
