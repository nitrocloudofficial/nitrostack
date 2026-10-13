import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';
import { DataService } from '../../shared/services/data.service.js';
import { AppointmentService } from '../../shared/services/appointment.service.js';

/**
 * Discovery Tools
 * 
 * Tools for browsing hospitals, medical specialties, and appointments
 */
@Injectable({ deps: [DataService, AppointmentService] })
export class DiscoveryTools {
  constructor(
    private dataService: DataService,
    private appointmentService: AppointmentService
  ) {}

  @Tool({
    name: 'list-hospitals',
    description: 'List all available hospitals with their details',
    inputSchema: z.object({}),
  })
  @Widget({ route: 'hospitals-grid' })
  async listHospitals(input: Record<string, never>, context: ExecutionContext) {
    const hospitals = this.dataService.getHospitals();
    return {
      hospitals: hospitals.map((h) => ({
        id: h.id,
        name: h.name,
        location: h.location,
        imageUrl: h.imageUrl,
        description: h.description,
      })),
    };
  }

  @Tool({
    name: 'list-specialties',
    description: 'List all available medical specialties',
    inputSchema: z.object({}),
  })
  @Widget({ route: 'specialties-grid' })
  async listSpecialties(input: Record<string, never>, context: ExecutionContext) {
    const specialties = this.dataService.getSpecialties();
    return {
      specialties: specialties.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        imageUrl: s.imageUrl,
      })),
    };
  }

  @Tool({
    name: 'search-doctors',
    description: 'Search for doctors by medical specialty name or ID',
    inputSchema: z.object({
      specialty: z.string().describe('The name or ID of the specialty, e.g. Cardiology')
    }),
    examples: {
      request: { specialty: 'Cardiology' },
      response: {
        doctors: [
          {
            id: 'doctor-001',
            name: 'Dr. Sarah Mitchell',
            specialtyId: 'cardiology',
            specialtyName: 'Cardiology',
            hospitalId: 'hospital-001',
            hospitalName: 'Metropolitan Medical Center',
            imageUrl: 'https://images.unsplash.com/...'
          }
        ]
      }
    }
  })
  @Widget({ route: 'doctor-profiles' })
  async searchDoctors(input: { specialty: string }, context: ExecutionContext) {
    const doctors = this.dataService.searchDoctors(input.specialty);
    return {
      doctors
    };
  }

  @Tool({
    name: 'filter-appointments-by-date',
    description: 'Filter scheduled appointments by a specific date (YYYY-MM-DD)',
    inputSchema: z.object({
      date: z.string().describe('The date to filter appointments for (format: YYYY-MM-DD, e.g. 2026-07-18)')
    }),
    examples: {
      request: { date: '2026-07-18' },
      response: {
        appointments: [
          {
            id: 'apt-001',
            patientId: 'patient-001',
            doctorId: 'doctor-001',
            hospitalId: 'hospital-001',
            specialtyId: 'cardiology',
            dateTime: '2026-07-18T10:00:00Z',
            status: 'scheduled',
            notes: 'Routine cardiovascular follow-up'
          }
        ]
      }
    }
  })
  async filterAppointments(input: { date: string }, context: ExecutionContext) {
    const appointments = this.appointmentService.filterAppointmentsByDate(input.date);
    return {
      appointments
    };
  }
}
