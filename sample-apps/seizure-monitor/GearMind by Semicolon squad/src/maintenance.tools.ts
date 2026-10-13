import dotenv from 'dotenv';
dotenv.config();

// @ts-ignore
import nodemailer from 'nodemailer';
import { z } from 'zod';

export const checkMachineHealthSchema = z.object({
  machineId: z.string().optional().describe('Machine ID (e.g. "CNC-01", "PRESS-04"). Omit for all.'),
});

export const predictFailureSchema = z.object({
  machineId: z.string().describe('Target machine ID.'),
  timeframeHours: z.number().optional().default(72),
});

export const scheduleMaintenanceSchema = z.object({
  machineId: z.string().describe('Exact Machine ID to schedule (e.g. MCH-212).'),
  maintenanceType: z.enum(['PREVENTATIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION']).optional().default('EMERGENCY'),
  scheduledDate: z.string().optional().describe('Scheduled date/time for maintenance.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('CRITICAL'),
  assignedTechnician: z.string().optional().default('Alex Vance'),
  recipientEmail: z.string().optional().default('cb.ai.u4aid25043@cb.students.amrita.edu'),
  technicianNotes: z.string().optional().describe('Reason for maintenance or diagnostic notes.'),
});

// Configure Gmail Transporter
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function extractExactMachineId(input: any): string {
  const rawString = typeof input === 'string' ? input : JSON.stringify(input || {});
  
  // Find any machine pattern: MCH-xxx, CNC-xxx, PRESS-xxx, ROBOT-xxx
  const match = rawString.match(/(MCH-[0-9]+|CNC-[0-9]+|PRESS-[0-9]+|ROBOT-[A-Z0-9-]+)/i);
  if (match) return match[0].toUpperCase();
  if (input?.machineId) return String(input.machineId).toUpperCase();
  if (input?.machine) return String(input.machine).toUpperCase();
  return 'MCH-UNKNOWN';
}
function parseMachineId(input: any): string {
  if (!input) return 'MCH-256';
  if (typeof input === 'string') {
    const match = input.match(/(MCH-[0-9]+|CNC-[0-9]+|PRESS-[0-9]+|ROBOT-[A-Z0-9-]+)/i);
    return match ? match[0].toUpperCase() : input.toUpperCase();
  }
  if (input?.machineId) return String(input.machineId).toUpperCase();
  if (input?.machine) return String(input.machine).toUpperCase();
  if (input?.machine_id) return String(input.machine_id).toUpperCase();
  if (input?.targetMachine) return String(input.targetMachine).toUpperCase();
  if (input?.id) return String(input.id).toUpperCase();
  const jsonStr = JSON.stringify(input);
  const match = jsonStr.match(/(MCH-[0-9]+|CNC-[0-9]+|PRESS-[0-9]+|ROBOT-[A-Z0-9-]+)/i);
  return match ? match[0].toUpperCase() : 'MCH-256';
}
export async function sendWorkOrderEmail(targetEmail: string, workOrder: any) {
  try {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;
    if (!user || !pass) {
      return { success: false, reason: '⚠️ Missing GMAIL_USER or GMAIL_PASS in .env' };
    }
    const info = await mailTransporter.sendMail({
      from: `"FactoryMind Maintenance AI" <${user}>`,
      to: targetEmail,
      subject: `🚨 [WORK ORDER CONFIRMED] ${workOrder.workOrderId} - ${workOrder.machineId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #334155;">
          
          <!-- Header -->
          <div style="border-bottom: 2px solid #22c55e; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #22c55e; margin: 0; font-size: 22px;">🛠️ Maintenance Work Order Created</h2>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Automated Dispatch by FactoryMind NitroStack AI Agent</p>
          </div>
          <!-- Work Order Info Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr style="background: #1e293b;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #334155; color: #cbd5e1; width: 40%;">Work Order ID:</td>
              <td style="padding: 10px; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 15px;">${workOrder.workOrderId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #334155; color: #cbd5e1;">Target Machine:</td>
              <td style="padding: 10px; border: 1px solid #334155; color: #facc15; font-weight: bold;">${workOrder.machineId}</td>
            </tr>
            <tr style="background: #1e293b;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #334155; color: #cbd5e1;">Maintenance Type:</td>
              <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc;">${workOrder.maintenanceType}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #334155; color: #cbd5e1;">Priority Level:</td>
              <td style="padding: 10px; border: 1px solid #334155; color: #ef4444; font-weight: bold;">${workOrder.priority}</td>
            </tr>
            <tr style="background: #1e293b;">
              <td style="padding: 10px; font-weight: bold; border: 1px solid #334155; color: #cbd5e1;">Scheduled Date:</td>
              <td style="padding: 10px; border: 1px solid #334155; color: #22c55e; font-weight: bold;">${workOrder.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border: 1px solid #334155; color: #cbd5e1;">Assigned Specialist:</td>
              <td style="padding: 10px; border: 1px solid #334155; color: #f8fafc;">${workOrder.assignedTechnician}</td>
            </tr>
          </table>
          <!-- Why Maintenance is Needed -->
          <div style="background: #1e293b; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
            <h3 style="color: #ef4444; margin: 0 0 8px 0; font-size: 15px;">⚠️ Why Maintenance is Needed</h3>
            <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.5;">
              ${workOrder.reason}
            </p>
          </div>
          <!-- Reserved Replacement Parts & Action Plan -->
          <div style="background: #0284c715; padding: 16px; border-radius: 8px; border: 1px solid #0284c740; margin-bottom: 20px;">
            <h4 style="color: #38bdf8; margin: 0 0 8px 0; font-size: 14px;">📦 Reserved Replacement Parts & Action Plan</h4>
            <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.6;">
              <li>Servo Drive Bearing Pack #3 (Part #SRV-901)</li>
              <li>High-Temp Synthetic Greasing Agent (NLGI Grade 2)</li>
              <li>Hydraulic Pressure Regulator Valve Seal</li>
              <li>Recalibrate Optical Encoders & Lockout/Tagout (LOTO)</li>
            </ul>
          </div>
          <!-- Footer -->
          <div style="border-top: 1px solid #334155; padding-top: 12px; text-align: center; color: #64748b; font-size: 12px;">
            Estimated Financial Downtime Impact Prevented: <strong style="color: #22c55e;">$45,000 / hr</strong><br/>
            FactoryMind Autonomous Plant Operations • NitroStack AI System
          </div>
        </div>
      `,
    });
    console.log('✅ Detailed Email Sent for', workOrder.machineId);
    return { success: true, reason: `Sent to ${targetEmail}` };
  } catch (err: any) {
    return { success: false, reason: `SMTP Error: ${err?.message || 'Check App Password'}` };
  }
}

export async function checkMachineHealthLogic(input: any) {
  const machineId = input?.machineId || 'MCH-212';
  const isCritical = machineId.includes('212') || machineId.includes('ROBOT');
  return {
    success: true,
    timestamp: new Date().toISOString(),
    machineId,
    status: isCritical ? 'CRITICAL' : 'HEALTHY',
    healthScore: isCritical ? 42 : 94,
    telemetry: { temp: isCritical ? 89.1 : 42.5, vibration: isCritical ? 8.9 : 1.2 },
  };
}

export async function predictFailureLogic(input: any) {
  const machineId = input?.machineId || 'MCH-212';
  const isCritical = machineId.includes('212') || machineId.includes('ROBOT');
  return {
    success: true,
    machineId,
    failureProbability: isCritical ? 89 : 12,
    riskSeverity: isCritical ? 'CRITICAL' : 'LOW',
    predictedComponentFailure: isCritical ? 'Servo Joint #3 Bearing Burnout' : 'Nominal wear',
  };
}

// Helper to extract exact Machine ID from any payload structure

export async function scheduleMaintenanceLogic(input: any) {
  const workOrderId = `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  // 1. EXTRACT EXACT MACHINE ID DIRECTLY
  const machineId = parseMachineId(input);
  const maintenanceType = input?.maintenanceType || 'EMERGENCY';
  const priority = input?.priority || 'CRITICAL';
  const recipientEmail = input?.recipientEmail || 'cb.ai.u4aid25043@cb.students.amrita.edu';
  const technician = input?.assignedTechnician || 'Alex Vance (Senior Maintenance Lead)';
  // 2. DAY/DATE ONLY (NO TIME)
  const scheduledDate = new Date(Date.now() + 86400000).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const reason = `Critical Telemetry Alert on ${machineId}: Vibration level (8.9 mm/s) exceeded nominal safety limit by 4.4x combined with severe thermal elevation (89.1°C). High risk of immediate bearing lockout and mechanical gear failure within 12 hours.`;
  // Work Order Object passed to BOTH Email and UI Widget Table
  const workOrder = {
    workOrderId,
    machineId,
    maintenanceType,
    priority,
    scheduledDate,
    assignedTechnician: technician,
    reason,
  };
  // Dispatch Email
  const emailResult = await sendWorkOrderEmail(recipientEmail, workOrder);
  const emailStatusLabel = emailResult.success ? `Sent to ${recipientEmail}` : emailResult.reason;
  return {
    content: [
      {
        type: 'text',
        text: `The maintenance has been successfully scheduled for Machine **${machineId}** on **${scheduledDate}** as an **${priority} priority** work order. Details sent to **${recipientEmail}**.`,
      },
    ],
    success: true,
    workOrderId,
    machineId,
    maintenanceType,
    priority,
    scheduledDate,
    reason,
    emailStatus: emailStatusLabel,
    _meta: {
      widget: {
        type: 'table',
        title: `✅ Maintenance Work Order: ${workOrderId}`,
        data: [
          { Field: 'Work Order ID', Value: workOrderId },
          { Field: 'Machine', Value: machineId },
          { Field: 'Priority', Value: priority },
          { Field: 'Scheduled Date', Value: scheduledDate },
          { Field: 'Reason', Value: reason },
          { Field: 'Email Status', Value: emailStatusLabel },
        ],
      },
    },
  };
}
export class MaintenanceTools {
  async checkMachineHealth(input: any) { return checkMachineHealthLogic(input); }
  async predictFailure(input: any) { return predictFailureLogic(input); }
  async scheduleMaintenance(input: any) { return scheduleMaintenanceLogic(input); }
}