import { NextResponse } from "next/server"
import { clearAuthCookies } from "@/lib/server/auth"

export async function POST() {
  clearAuthCookies()
  return NextResponse.json({ success: true })
}
