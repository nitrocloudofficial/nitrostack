import { NextRequest, NextResponse } from "next/server"
import { getSyncedEngine } from "@/lib/server/synced-engine"
import { buildFormVPDFDocument, formVPDFFileName } from "@/lib/pdf-generator"
import { guardRoute } from "@/lib/server/auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ factoryId: string }> }
) {
  await guardRoute()
  const { factoryId } = await params
  const engine = await getSyncedEngine()
  const factory = engine.getFactories().find((item) => item.id === factoryId)

  if (!factory) {
    return NextResponse.json(
      { error: `Factory not found: ${factoryId}` },
      { status: 404 }
    )
  }

  const doc = buildFormVPDFDocument(factory)
  const arrayBuffer = doc.output("arraybuffer")
  const filename = formVPDFFileName(factory)

  return new NextResponse(Buffer.from(arrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
