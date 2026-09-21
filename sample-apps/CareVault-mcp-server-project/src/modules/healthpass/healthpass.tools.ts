/**
 * HealthPass Lite Tools
 * 
 * Core tools for patient healthcare management:
 * - authenticatePatient: Verify patient identity
 * - getUpcomingAppointments: Retrieve scheduled appointments
 * - bookAppointment: Schedule a new appointment
 * - getLabReports: Retrieve lab test results
 * - getCurrentMedicines: Get current prescriptions
 * - setMedicineReminder: Set reminder times for medicines
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { MOCK_PATIENTS } from '../../fixtures/patients.js';
import {
  getPatientAppointments,
  addAppointment,
  generateAppointmentId,
  Appointment
} from '../../fixtures/appointments.js';
import { getPatientLabReports } from '../../fixtures/labReports.js';
import { getPatientMedicines } from '../../fixtures/medicines.js';
import {
  setMedicineReminder as storeReminder
} from '../../fixtures/reminders.js';

export class HealthPassTools {
  /**
   * Authenticate a patient by ID
   * Returns a mock session token and basic patient info
   */
  @Tool({
    name: 'authenticatePatient',
    description: 'Authenticate a patient by ID and return a session token',
    inputSchema: z.object({
      patientId: z.string().describe('The patient ID (e.g., patient_001)')
    })
  })
  async authenticatePatient(
    input: { patientId: string },
    ctx: ExecutionContext
  ): Promise<{ success: boolean; sessionToken?: string; patientName?: string; message: string }> {
    const patient = MOCK_PATIENTS[input.patientId];

    if (!patient) {
      ctx.logger.warn(`Authentication failed for patient: ${input.patientId}`);
      return {
        success: false,
        message: `Patient ${input.patientId} not found`
      };
    }

    const sessionToken = `session_${input.patientId}_${Date.now()}`;
    ctx.logger.info(`Patient authenticated: ${patient.name} (${input.patientId})`);

    return {
      success: true,
      sessionToken,
      patientName: patient.name,
      message: `Welcome, ${patient.name}!`
    };
  }

  /**
   * Get upcoming appointments for a patient
   */
  @Tool({
    name: 'getUpcomingAppointments',
    description: 'Retrieve upcoming appointments for a patient',
    inputSchema: z.object({
      patientId: z.string().describe('The patient ID')
    })
  })
  @Widget('appointment-cards')
  async getUpcomingAppointments(
    input: { patientId: string },
    ctx: ExecutionContext
  ): Promise<{ appointments: Array<{ id: string; doctorName: string; specialty: string; date: string; time: string; status: string }>; count: number }> {
    const appointments = getPatientAppointments(input.patientId);

    // Filter for scheduled appointments and sort by date
    const upcoming = appointments
      .filter(apt => apt.status === 'scheduled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    ctx.logger.info(`Retrieved ${upcoming.length} upcoming appointments for patient ${input.patientId}`);

    return {
      appointments: upcoming.map(apt => ({
        id: apt.id,
        doctorName: apt.doctorName,
        specialty: apt.specialty,
        date: apt.date,
        time: apt.time,
        status: apt.status
      })),
      count: upcoming.length
    };
  }

  /**
   * Book a new appointment for a patient
   */
  @Tool({
    name: 'bookAppointment',
    description: 'Book a new appointment for a patient with a doctor',
    inputSchema: z.object({
      patientId: z.string().describe('The patient ID'),
      doctorId: z.string().describe('The doctor ID'),
      doctorName: z.string().describe('The doctor name'),
      specialty: z.string().describe('The doctor specialty'),
      date: z.string().describe('Appointment date (YYYY-MM-DD)'),
      time: z.string().describe('Appointment time (HH:MM)')
    })
  })
  async bookAppointment(
    input: {
      patientId: string;
      doctorId: string;
      doctorName: string;
      specialty: string;
      date: string;
      time: string;
    },
    ctx: ExecutionContext
  ): Promise<{ success: boolean; appointmentId?: string; message: string }> {
    // Validate patient exists
    if (!MOCK_PATIENTS[input.patientId]) {
      ctx.logger.warn(`Book appointment failed: patient ${input.patientId} not found`);
      return {
        success: false,
        message: `Patient ${input.patientId} not found`
      };
    }

    const appointmentId = generateAppointmentId();
    const newAppointment: Appointment = {
      id: appointmentId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      specialty: input.specialty,
      date: input.date,
      time: input.time,
      status: 'scheduled'
    };

    addAppointment(newAppointment);
    ctx.logger.info(
      `Appointment booked: ${appointmentId} for patient ${input.patientId} with ${input.doctorName} on ${input.date} at ${input.time}`
    );

    return {
      success: true,
      appointmentId,
      message: `Appointment booked successfully with ${input.doctorName} on ${input.date} at ${input.time}`
    };
  }

  /**
   * Get lab reports for a patient
   */
  @Tool({
    name: 'getLabReports',
    description: 'Retrieve lab test reports for a patient',
    inputSchema: z.object({
      patientId: z.string().describe('The patient ID')
    })
  })
  @Widget('lab-reports')
  async getLabReports(
    input: { patientId: string },
    ctx: ExecutionContext
  ): Promise<{
    reports: Array<{
      id: string;
      testName: string;
      date: string;
      result: number;
      unit: string;
      normalRange: { min: number; max: number };
      isAbnormal: boolean;
      notes?: string;
    }>;
    count: number;
  }> {
    const reports = getPatientLabReports(input.patientId);

    // Sort by date descending (most recent first)
    const sorted = reports.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    ctx.logger.info(`Retrieved ${sorted.length} lab reports for patient ${input.patientId}`);

    return {
      reports: sorted.map(report => ({
        id: report.id,
        testName: report.testName,
        date: report.date,
        result: report.result,
        unit: report.unit,
        normalRange: report.normalRange,
        isAbnormal: report.isAbnormal,
        notes: report.notes
      })),
      count: sorted.length
    };
  }

  /**
   * Get current medicines for a patient
   */
  @Tool({
    name: 'getCurrentMedicines',
    description: 'Retrieve current medicines and prescriptions for a patient',
    inputSchema: z.object({
      patientId: z.string().describe('The patient ID')
    })
  })
  async getCurrentMedicines(
    input: { patientId: string },
    ctx: ExecutionContext
  ): Promise<{
    medicines: Array<{
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      startDate: string;
      endDate?: string;
      prescribedBy: string;
    }>;
    count: number;
  }> {
    const medicines = getPatientMedicines(input.patientId);

    ctx.logger.info(`Retrieved ${medicines.length} medicines for patient ${input.patientId}`);

    return {
      medicines: medicines.map(med => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        startDate: med.startDate,
        endDate: med.endDate,
        prescribedBy: med.prescribedBy
      })),
      count: medicines.length
    };
  }

  /**
   * Set a medicine reminder schedule
   */
  @Tool({
    name: 'setMedicineReminder',
    description: 'Set reminder times for a medicine',
    inputSchema: z.object({
      patientId: z.string().describe('The patient ID'),
      medicineId: z.string().describe('The medicine ID'),
      times: z.array(z.string()).describe('Array of reminder times in HH:MM format (e.g., ["08:00", "20:00"])')
    })
  })
  async setMedicineReminder(
    input: { patientId: string; medicineId: string; times: string[] },
    ctx: ExecutionContext
  ): Promise<{ success: boolean; message: string; reminderTimes?: string[] }> {
    // Validate patient exists
    if (!MOCK_PATIENTS[input.patientId]) {
      ctx.logger.warn(`Set reminder failed: patient ${input.patientId} not found`);
      return {
        success: false,
        message: `Patient ${input.patientId} not found`
      };
    }

    // Validate medicine exists for patient
    const medicines = getPatientMedicines(input.patientId);
    const medicine = medicines.find(m => m.id === input.medicineId);

    if (!medicine) {
      ctx.logger.warn(
        `Set reminder failed: medicine ${input.medicineId} not found for patient ${input.patientId}`
      );
      return {
        success: false,
        message: `Medicine ${input.medicineId} not found for this patient`
      };
    }

    // Store the reminder
    const reminder = storeReminder(input.patientId, input.medicineId, input.times);

    ctx.logger.info(
      `Reminder set for patient ${input.patientId}, medicine ${medicine.name} at times: ${input.times.join(', ')}`
    );

    return {
      success: true,
      message: `Reminder set for ${medicine.name} at ${input.times.join(', ')}`,
      reminderTimes: reminder.times
    };
  }
}
