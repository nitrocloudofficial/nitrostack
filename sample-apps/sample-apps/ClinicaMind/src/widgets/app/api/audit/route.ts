import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { AuditRepository } from '../../../../db/repositories/audit.repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const logs = AuditRepository.getAll(limit);
    return NextResponse.json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
