import { getServerSession } from "next-auth";
import Anthropic from "@anthropic-ai/sdk";
import { isAllowed } from "@/lib/escaner-iva-config";
import { authOptions } from "@/lib/auth";

export const maxDuration = 60;

const SYS =
  "Eres un contador argentino experto en análisis de tickets y facturas " +
  "emitidas a nombre de nuestra empresa (Blo, Bienestar, logística y " +
  "organización S.A). Tu tarea consiste en analizar las imágenes de tickets " +
  "y facturas emitidas según la normativa fiscal argentina vigente y extraer " +
  "los datos de las mismas en formato tabla para que se puedan trabajar los " +
  "datos posteriormente. Deberás concentrarte en extraer los datos del " +
  "proveedor y de la operación. Además, es vital identificar el tipo de " +
  "comprobante.\n\n" +
  "REGLAS OBLIGATORIAS:\n" +
  "1. Es probable que en una imagen se presenten dos o más tickets " +
  "diferentes, por lo que deberás concentrarte en identificarlos por " +
  "separado para no mezclar datos.\n" +
  "2. Si alguna vez se genera alguna duda sobre cuántos comprobantes hay, " +
  "indicalo en el campo advertencias.\n" +
  "3. El formato de los números debe utilizar la , como separador de " +
  "decimales y no separar los miles.\n" +
  "4. NUNCA incluyas el signo $ en los valores mostrados.\n" +
  "5. Si en algún momento no encuentras un dato o no lo puedes leer, no lo " +
  "inventes. Incluye el valor exacto ILEGIBLE para ese campo.\n" +
  "6. Si un campo no aplica al tipo de comprobante analizado, usá null.\n\n" +
  'Respondé ÚNICAMENTE con JSON válido, sin texto adicional, sin backticks, ' +
  'sin comentarios: {"comprobantes":[{"fecha_comprobante":"DD/MM/AAAA",' +
  '"tipo_comprobante":"Factura A|Factura B|Ticket|NC A|NC B|ND A|ND B|etc.",' +
  '"cuit_proveedor":"XX-XXXXXXXX-X","denominacion":"Razón social",' +
  '"punto_venta":"XXXX","numero_comprobante":"XXXXXXXX","neto_21":"0,00 o null",' +
  '"iva_21":"0,00 o null","neto_105":"0,00 o null","iva_105":"0,00 o null",' +
  '"neto_27":"0,00 o null","iva_27":"0,00 o null","exento_no_gravado":"0,00 o null",' +
  '"otros_tributos":"0,00 o null","percep_iibb_mza":"0,00 o null",' +
  '"percep_iibb_caba":"0,00 o null","percep_iva":"0,00 o null",' +
  '"total_comprobante":"0,00 o null","observaciones":"advertencia o null"}],' +
  '"advertencias":"observación general o null"}';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const login = session.user.login;
  if (!isAllowed(login)) {
    return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  const { files } = body;
  if (!files?.length) {
    return Response.json({ error: "Sin archivos" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contentParts = [
    ...files.map((f) =>
      f.isPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.b64 } }
        : { type: "image", source: { type: "base64", media_type: f.mediaType, data: f.b64 } }
    ),
    {
      type: "text",
      text: files.length === 1
        ? "Analizá esta imagen y extraé todos los comprobantes fiscales."
        : `Analizá estas ${files.length} imágenes y extraé todos los comprobantes fiscales.`,
    },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYS,
      messages: [{ role: "user", content: contentParts }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) throw new Error("Sin respuesta de texto");

    const parsed = JSON.parse(textBlock.text.replace(/```json|```/g, "").trim());
    return Response.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ error: msg }, { status: 500 });
  }
}
