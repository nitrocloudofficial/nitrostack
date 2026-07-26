/**
 * Mock appointment store for HealthPass Lite
 */

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // HH:MM format
  status: 'scheduled' | 'completed' | 'cancelled';
}

// In-memory store (persists during session)
let appointmentIdCounter = 1000;

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt_001',
    patientId: 'patient_001',
    doctorId: 'doc_101',
    doctorName: 'Dr. Sarah Mitchell',
    specialty: 'Cardiology',
    date: '2026-08-15',
    time: '10:30',
    status: 'scheduled'
  },
  {
    id: 'apt_002',
    patientId: 'patient_001',
    doctorId: 'doc_102',
    doctorName: 'Dr. James Chen',
    specialty: 'General Practice',
    date: '2026-08-22',
    time: '14:00',
    status: 'scheduled'
  },
  {
    id: 'apt_003',
    patientId: 'patient_002',
    doctorId: 'doc_103',
    doctorName: 'Dr. Emily Rodriguez',
    specialty: 'Orthopedics',
    date: '2026-08-18',
    time: '09:15',
    status: 'scheduled'
  },
  {
    id: 'apt_004',
    patientId: 'patient_003',
    doctorId: 'doc_101',
    doctorName: 'Dr. Sarah Mitchell',
    specialty: 'Cardiology',
    date: '2026-08-20',
    time: '11:00',
    status: 'scheduled'
  },
  {
    id: 'apt_005',
    patientId: 'patient_004',
    doctorId: 'doc_104',
    doctorName: 'Dr. Michael Brown',
    specialty: 'Neurology',
    date: '2026-08-25',
    time: '15:30',
    status: 'scheduled'
  }
];

/**
 * Generate a new appointment ID
 */
export function generateAppointmentId(): string {
  return `apt_${++appointmentIdCounter}`;
}

/**
 * Add a new appointment to the store
 */
export function addAppointment(appointment: Appointment): Appointment {
  MOCK_APPOINTMENTS.push(appointment);
  return appointment;
}

/**
 * Get appointments for a patient
 */
export function getPatientAppointments(patientId: string): Appointment[] {
  return MOCK_APPOINTMENTS.filter(apt => apt.patientId === patientId);
}
