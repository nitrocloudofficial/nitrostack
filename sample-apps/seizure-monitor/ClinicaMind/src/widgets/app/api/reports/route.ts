import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { ReportService } from '../../../../services/report.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || undefined;
    const reports = ReportService.getReports(patientId);
    return NextResponse.json({ success: true, count: reports.length, data: reports });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.visitId || !body.patientId || !body.reportType || !body.title || !body.content) {
      return NextResponse.json({ success: false, error: 'visitId, patientId, reportType, title, and content are required' }, { status: 400 });
    }

    const report = ReportService.createReport(body);
    return NextResponse.json({ success: true, data: report }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to create report' }, { status: 500 });
  }
}
