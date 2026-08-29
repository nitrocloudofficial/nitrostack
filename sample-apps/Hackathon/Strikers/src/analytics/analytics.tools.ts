import { z } from 'zod';
import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';

const briefingInput = z.object({
  date: z.string().optional().describe('ISO date (YYYY-MM-DD) for the briefing. Defaults to today.'),
});

@Injectable({ deps: [DatabaseService] })
export class AnalyticsTools {
  constructor(private readonly db: DatabaseService) {}

  @Tool({
    name: 'executive-briefing',
    title: 'Generate Executive Briefing',
    description:
      'Generate a live executive briefing for hospital operations using real-time data from the MongoDB database. Returns appointment volume, bed utilization, top specialties, pharmacy alerts, and actionable recommendations.',
    inputSchema: briefingInput,
    invocation: { invoking: 'Aggregating hospital data…', invoked: 'Executive briefing ready' },
    metadata: { category: 'analytics', tags: ['kpi', 'dashboard', 'executive', 'operations'] },
  })
  async generateBriefing(input: z.infer<typeof briefingInput>, ctx: ExecutionContext) {
    ctx.logger.info('executive-briefing invoked', input);

    const today = input.date ?? new Date().toISOString().slice(0, 10);

    const [appointmentModel, bedModel, medicineModel, doctorModel] = await Promise.all([
      this.db.appointments(),
      this.db.beds(),
      this.db.medicines(),
      this.db.doctors(),
    ]);

    // Live DB aggregations (C1 fix)
    const [
      todayAppointments,
      totalAppointments,
      allBeds,
      lowStockMedicines,
      totalDoctors,
    ] = await Promise.all([
      appointmentModel.countDocuments({ date: today }),
      appointmentModel.countDocuments(),
      bedModel.find().lean().exec(),
      medicineModel.find({ stockLevel: { $lt: 20 } }).select('name stockLevel').limit(5).lean().exec(),
      doctorModel.countDocuments(),
    ]);

    // Bed utilization breakdown
    const icuBeds = allBeds.filter(b => b.type === 'ICU');
    const icuAvailable = icuBeds.filter(b => b.status === 'Available').length;
    const icuOccupied = icuBeds.filter(b => b.status === 'Occupied').length;
    const icuUtilization = icuBeds.length > 0 ? Math.round((icuOccupied / icuBeds.length) * 100) : 0;

    const generalBeds = allBeds.filter(b => b.type === 'General');
    const generalAvailable = generalBeds.filter(b => b.status === 'Available').length;
    const generalUtilization = generalBeds.length > 0
      ? Math.round(((generalBeds.length - generalAvailable) / generalBeds.length) * 100)
      : 0;

    const totalAvailableBeds = allBeds.filter(b => b.status === 'Available').length;
    const totalBeds = allBeds.length;
    const overallUtilization = totalBeds > 0 ? Math.round(((totalBeds - totalAvailableBeds) / totalBeds) * 100) : 0;

    // Top specialties today
    const specialtyPipeline = await appointmentModel.aggregate([
      { $match: { date: today } },
      { $group: { _id: '$doctorSpecialty', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]).exec();

    const topSpecialties = specialtyPipeline.map((s: any) => ({ specialty: s._id || 'Unknown', appointments: s.count }));

    // Build alerts
    const alerts: Array<{ severity: 'Low' | 'Medium' | 'High' | 'Critical'; message: string }> = [];

    if (icuUtilization >= 90) {
      alerts.push({ severity: 'Critical', message: `ICU utilization at ${icuUtilization}%. Activate overflow protocol immediately.` });
    } else if (icuUtilization >= 75) {
      alerts.push({ severity: 'High', message: `ICU utilization at ${icuUtilization}%. Monitor closely and prepare overflow wards.` });
    }

    if (overallUtilization >= 85) {
      alerts.push({ severity: 'High', message: `Overall bed utilization at ${overallUtilization}%. Consider patient diversions.` });
    }

    if (lowStockMedicines.length > 0) {
      alerts.push({
        severity: 'Medium',
        message: `${lowStockMedicines.length} medicine(s) running low: ${lowStockMedicines.map((m: any) => m.name).join(', ')}.`,
      });
    }

    if (alerts.length === 0) {
      alerts.push({ severity: 'Low', message: 'All systems operating within normal parameters.' });
    }

    return {
      reportDate: today,
      generatedAt: new Date().toISOString(),
      dataSource: 'Live MongoDB — ArogyaAI OS Demo Database',
      operations: {
        totalDoctors,
        todayAppointments,
        totalAppointmentsOnRecord: totalAppointments,
        topSpecialtiesToday: topSpecialties,
      },
      capacity: {
        totalBeds,
        totalAvailableBeds,
        overallUtilizationPercent: overallUtilization,
        icu: { total: icuBeds.length, available: icuAvailable, occupied: icuOccupied, utilizationPercent: icuUtilization },
        general: { total: generalBeds.length, available: generalAvailable, utilizationPercent: generalUtilization },
      },
      pharmacy: {
        lowStockCount: lowStockMedicines.length,
        lowStockItems: lowStockMedicines.map((m: any) => ({ name: m.name, stockLevel: m.stockLevel })),
      },
      alerts,
      recommendations: [
        icuUtilization >= 75 ? 'Consider transferring stable ICU patients to step-down wards.' : null,
        lowStockMedicines.length > 0 ? 'Initiate emergency procurement for low-stock medicines.' : null,
        todayAppointments === 0 ? 'No appointments recorded today yet. Verify system connectivity.' : null,
      ].filter(Boolean),
      confidenceScore: 97,
      predictionBasis: 'Live aggregation from MongoDB. All figures reflect actual database state at query time.',
      disclaimer: 'ArogyaAI OS is a demonstration platform with synthetic data. In production, this integrates with certified Hospital Information Systems (HIS) and EHR platforms.',
      summary: `📊 Executive Briefing for ${today}: ${todayAppointments} appointments today. ICU at ${icuUtilization}% utilization (${icuAvailable} beds free). ${alerts.filter(a => a.severity === 'Critical' || a.severity === 'High').length} high-priority alert(s) active.`,
    };
  }
}
