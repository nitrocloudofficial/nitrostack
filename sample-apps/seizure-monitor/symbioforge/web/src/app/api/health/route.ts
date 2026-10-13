import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Basic health check response
    return NextResponse.json(
      {
        status: "ok",
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    )
  }
}
