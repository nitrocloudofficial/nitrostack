import { Injectable } from '@nitrostack/core';
import { Appointment } from '../schemas/appointment.schema.js';

@Injectable()
export class AppointmentService {
  private appointments: Appointment[] = [
    {
      id: 'apt-001',
      patientId: 'patient-001',
      doctorId: 'doctor-001',
      hospitalId: 'hospital-001',
      specialtyId: 'cardiology',
      dateTime: '2026-07-18T10:00:00Z',
      status: 'scheduled',
      notes: 'Routine cardiovascular follow-up'
    },
    {
      id: 'apt-002',
      patientId: 'patient-002',
      doctorId: 'doctor-004',
      hospitalId: 'hospital-002',
      specialtyId: 'pediatrics',
      dateTime: '2026-07-18T14:30:00Z',
      status: 'scheduled',
      notes: 'General checkup'
    },
    {
      id: 'apt-003',
      patientId: 'patient-003',
      doctorId: 'doctor-002',
      hospitalId: 'hospital-001',
      specialtyId: 'neurology',
      dateTime: '2026-07-19T09:00:00Z',
      status: 'scheduled',
      notes: 'EEG reading review'
    },
    {
      id: 'apt-004',
      patientId: 'patient-001',
      doctorId: 'doctor-005',
      hospitalId: 'hospital-002',
      specialtyId: 'dermatology',
      dateTime: '2026-07-20T11:15:00Z',
      status: 'scheduled',
      notes: 'Skin rash follow-up'
    },
    {
      id: 'apt-005',
      patientId: 'patient-004',
      doctorId: 'doctor-001',
      hospitalId: 'hospital-001',
      specialtyId: 'cardiology',
      dateTime: '2026-07-18T16:00:00Z',
      status: 'scheduled',
      notes: 'Echocardiogram check'
    }
  ];

  getAppointments(): Appointment[] {
    return this.appointments;
  }

  filterAppointmentsByDate(dateStr: string): Appointment[] {
    // Extract date part (YYYY-MM-DD) for robust matching
    const targetDate = dateStr.split('T')[0];
    return this.appointments.filter(apt => {
      const aptDate = apt.dateTime.split('T')[0];
      return aptDate === targetDate;
    });
  }

  bookAppointment(input: {
    patientId: string;
    doctorId: string;
    hospitalId: string;
    specialtyId: string;
    dateTime: string;
    notes?: string;
  }): Appointment {
    const newAppointment: Appointment = {
      id: `apt-${Math.random().toString(36).substr(2, 9)}`,
      patientId: input.patientId,
      doctorId: input.doctorId,
      hospitalId: input.hospitalId,
      specialtyId: input.specialtyId,
      dateTime: input.dateTime,
      status: 'scheduled',
      notes: input.notes
    };
    this.appointments.push(newAppointment);
    return newAppointment;
  }
}
