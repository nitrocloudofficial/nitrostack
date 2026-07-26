import { fakerEN_IN as faker } from '@faker-js/faker';
import type { DoctorEntity } from './schemas/doctor.schema.js';
import type { BedEntity } from './schemas/bed.schema.js';
import type { MedicineEntity } from './schemas/medicine.schema.js';
import type { LabTestEntity } from './schemas/lab-test.schema.js';
import type { SlotEntity, SlotStatus, ConsultationMode } from './schemas/slot.schema.js';
import type { AppointmentEntity, AppointmentStatus } from './schemas/appointment.schema.js';
import type { IncidentEntity } from './schemas/incident.schema.js';
import type { PatientPreferenceEntity } from './schemas/patient-preference.schema.js';
import type { ReminderEntity, ReminderType, ReminderStatus } from './schemas/reminder.schema.js';

faker.seed(42); // Deterministic generation

const CITIES = [
  'Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune',
  'Coimbatore', 'Kochi', 'Madurai', 'Mysore', 'Trivandrum', 'Ahmedabad',
  'Jaipur', 'Lucknow', 'Visakhapatnam', 'Vijayawada', 'Nagpur', 'Indore',
  'Noida', 'Gurgaon'
];

const HOSPITAL_BRANDS = [
  'Apollo', 'Fortis', 'Aster', 'Manipal', 'Narayana', 'AIIMS', 'CMC', 'KIMS', 'Kauvery',
  'Max Healthcare', 'Care Hospitals', 'Yashoda', 'Medanta', 'Global', 'Columbia Asia'
];

const SPECIALTIES = [
  { slug: 'cardiology', title: 'Cardiologist', aliases: ['heart', 'cardiac'] },
  { slug: 'orthopedics', title: 'Orthopedic Surgeon', aliases: ['bone', 'joint'] },
  { slug: 'neurology', title: 'Neurologist', aliases: ['brain', 'nerves'] },
  { slug: 'dermatology', title: 'Dermatologist', aliases: ['skin', 'hair'] },
  { slug: 'pediatrics', title: 'Pediatrician', aliases: ['child', 'kids'] },
  { slug: 'emergency', title: 'Emergency Medicine', aliases: ['trauma', 'casualty'] },
  { slug: 'ent', title: 'ENT Specialist', aliases: ['ear', 'nose', 'throat'] },
  { slug: 'ophthalmology', title: 'Ophthalmologist', aliases: ['eye'] },
  { slug: 'psychiatry', title: 'Psychiatrist', aliases: ['mental health', 'therapy'] },
  { slug: 'gynaecology', title: 'Gynaecologist', aliases: ['women', 'pregnancy'] },
  { slug: 'oncology', title: 'Oncologist', aliases: ['cancer', 'tumor'] },
  { slug: 'urology', title: 'Urologist', aliases: ['kidney', 'urinary'] },
  { slug: 'gastroenterology', title: 'Gastroenterologist', aliases: ['stomach', 'digestion'] },
  { slug: 'endocrinology', title: 'Endocrinologist', aliases: ['diabetes', 'thyroid'] },
  { slug: 'pulmonology', title: 'Pulmonologist', aliases: ['lungs', 'breathing'] },
  { slug: 'rheumatology', title: 'Rheumatologist', aliases: ['arthritis', 'joints'] },
  { slug: 'nephrology', title: 'Nephrologist', aliases: ['kidney', 'renal'] },
  { slug: 'plastic-surgery', title: 'Plastic Surgeon', aliases: ['cosmetic', 'reconstruction'] },
  { slug: 'general-surgery', title: 'General Surgeon', aliases: ['surgery', 'operation'] },
  { slug: 'internal-medicine', title: 'Internal Medicine', aliases: ['general physician', 'fever'] },
  // Adding more to reach 40 (duplicating with slight variations for volume)
  { slug: 'dentistry', title: 'Dentist', aliases: ['teeth', 'dental'] },
  { slug: 'orthodontics', title: 'Orthodontist', aliases: ['braces', 'teeth'] },
  { slug: 'radiology', title: 'Radiologist', aliases: ['xray', 'mri', 'scan'] },
  { slug: 'pathology', title: 'Pathologist', aliases: ['blood', 'lab'] },
  { slug: 'anesthesiology', title: 'Anesthesiologist', aliases: ['anesthesia', 'sedation'] },
  { slug: 'neonatology', title: 'Neonatologist', aliases: ['newborn', 'baby'] },
  { slug: 'sports-medicine', title: 'Sports Medicine', aliases: ['sports', 'athlete'] },
  { slug: 'geriatrics', title: 'Geriatrician', aliases: ['elderly', 'old age'] },
  { slug: 'hematology', title: 'Hematologist', aliases: ['blood', 'anemia'] },
  { slug: 'immunology', title: 'Immunologist', aliases: ['immune', 'allergies'] },
  { slug: 'infectious-disease', title: 'Infectious Disease', aliases: ['infection', 'virus'] },
  { slug: 'medical-genetics', title: 'Medical Geneticist', aliases: ['dna', 'genetics'] },
  { slug: 'nuclear-medicine', title: 'Nuclear Medicine', aliases: ['radiation', 'nuclear'] },
  { slug: 'occupational-medicine', title: 'Occupational Medicine', aliases: ['work', 'occupational'] },
  { slug: 'pain-medicine', title: 'Pain Medicine', aliases: ['pain', 'relief'] },
  { slug: 'physical-medicine', title: 'Physical Medicine', aliases: ['rehab', 'physiotherapy'] },
  { slug: 'preventive-medicine', title: 'Preventive Medicine', aliases: ['prevention', 'wellness'] },
  { slug: 'sleep-medicine', title: 'Sleep Medicine', aliases: ['sleep', 'insomnia'] },
  { slug: 'vascular-surgery', title: 'Vascular Surgeon', aliases: ['veins', 'arteries'] },
  { slug: 'dietetics', title: 'Dietitian', aliases: ['diet', 'nutrition'] },
];

const LAB_TEST_NAMES = [
  'Complete Blood Count (CBC)', 'MRI Brain', 'CT Scan', 'ECG', 'Blood Sugar Fasting',
  'HbA1c', 'Lipid Profile', 'Liver Function Test (LFT)', 'Kidney Function Test (KFT)',
  'Vitamin D', 'Thyroid Profile', 'Urine Analysis', 'COVID-19 RT-PCR', 'Dengue NS1',
  'Malaria Antigen', 'X-Ray Chest', 'Ultrasound Abdomen', 'Serum Calcium', 'Iron Profile',
  'Vitamin B12', 'CRP', 'ESR', 'Serum Creatinine', 'Uric Acid', 'PSA', 'Testosterone',
  'Prolactin', 'FSH', 'LH', 'Serum Electrolytes'
];

export const HOSPITALS = Array.from({ length: 100 }, (_, i) => {
  const brand = faker.helpers.arrayElement(HOSPITAL_BRANDS);
  const city = faker.helpers.arrayElement(CITIES);
  return `${brand} Hospital - ${city} ${faker.location.street()}`;
});

export function generateDoctors(count: number): DoctorEntity[] {
  const doctors: DoctorEntity[] = [];
  for (let i = 0; i < count; i++) {
    const spec = faker.helpers.arrayElement(SPECIALTIES);
    const hospital = faker.helpers.arrayElement(HOSPITALS);
    const city = hospital.split(' - ')[1].split(' ')[0]; // Extract city from hospital name
    
    doctors.push({
      doctorId: `doc_${i}`,
      name: `Dr. ${faker.person.firstName()} ${faker.person.lastName()}`,
      specialty: spec.title,
      specialtySlug: spec.slug,
      specialtyAliases: spec.aliases,
      city,
      hospital,
      address: faker.location.streetAddress(),
      qualifications: faker.helpers.arrayElement(['MBBS, MD', 'MBBS, MS', 'MBBS, DNB', 'MD, DM', 'MS, MCh']),
      experienceYears: faker.number.int({ min: 2, max: 40 }),
      languages: faker.helpers.arrayElements(['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Marathi', 'Gujarati'], { min: 1, max: 3 }),
      consultationFee: faker.number.int({ min: 300, max: 2000, multipleOf: 100 }),
      currency: 'INR',
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      reviewCount: faker.number.int({ min: 10, max: 5000 }),
      imageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTQ3NTl8MHwxfHNlYXJjaHwxfHxkb2N0b3J8ZW58MXwyfHx8MTc4NDk3NjQxNnw&ixlib=rb-4.1.0&q=80&w=1080',
      bio: faker.lorem.paragraph(),
      acceptsInsurance: faker.datatype.boolean(0.7),
      distance: faker.number.float({ min: 0.5, max: 20.0, fractionDigits: 1 }),
      estimatedWaitingTime: faker.number.int({ min: 5, max: 60, multipleOf: 5 }),
    });
  }
  return doctors;
}

export function generateSlots(doctors: DoctorEntity[], count: number): SlotEntity[] {
  const slots: SlotEntity[] = [];
  for (let i = 0; i < count; i++) {
    const doc = faker.helpers.arrayElement(doctors);
    const date = faker.date.soon({ days: 30 }).toISOString().split('T')[0];
    const hour = faker.number.int({ min: 9, max: 18 });
    const min = faker.helpers.arrayElement(['00', '30']);
    const status = faker.helpers.arrayElement(['available', 'booked']) as SlotStatus;
    
    slots.push({
      slotId: `slot_${i}`,
      doctorId: doc.doctorId,
      date,
      startTime: `${hour.toString().padStart(2, '0')}:${min}`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:${min}`,
      mode: faker.helpers.arrayElement(['in-person', 'video']) as ConsultationMode,
      status,
      fee: doc.consultationFee,
      bookingId: status === 'booked' ? `book_${i}` : null,
    });
  }
  return slots;
}

export function generateAppointments(slots: SlotEntity[], count: number): AppointmentEntity[] {
  const appointments: AppointmentEntity[] = [];
  const bookedSlots = slots.filter(s => s.status === 'booked');
  
  for (let i = 0; i < Math.min(count, bookedSlots.length); i++) {
    const slot = bookedSlots[i];
    appointments.push({
      bookingId: slot.bookingId as string,
      status: faker.helpers.arrayElement(['Confirmed', 'Completed', 'Cancelled']) as AppointmentStatus,
      doctorId: slot.doctorId,
      doctorName: `Dr. ${faker.person.lastName()}`, // Simplified for speed
      doctorSpecialty: 'Specialist',
      doctorImageUrl: '',
      hospital: 'Arogya Hospital',
      address: 'Main St',
      city: 'Bangalore',
      slotId: slot.slotId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      mode: slot.mode,
      fee: slot.fee,
      currency: 'INR',
      patientName: `${faker.person.firstName()} ${faker.person.lastName()}`,
      patientPhone: faker.phone.number({ style: 'national' }),
      createdAt: faker.date.recent({ days: 30 }),
      history: [{ status: 'Confirmed', timestamp: new Date() }],
    });
  }
  return appointments;
}

export function generateBeds(count: number): BedEntity[] {
  const beds: BedEntity[] = [];
  const types = ['ICU', 'General', 'Emergency', 'Private', 'Semi-private'];
  for (let i = 0; i < count; i++) {
    beds.push({
      bedId: `bed_${i}`,
      type: faker.helpers.arrayElement(types) as any,
      status: faker.helpers.arrayElement(['Occupied', 'Available', 'Reserved', 'Maintenance']) as any,
      hospital: faker.helpers.arrayElement(HOSPITALS),
      lastUpdated: faker.date.recent(),
    });
  }
  return beds;
}

export function generateMedicines(count: number): MedicineEntity[] {
  const medicines: MedicineEntity[] = [];
  for (let i = 0; i < count; i++) {
    const stock = faker.number.int({ min: 0, max: 5000 });
    medicines.push({
      medicineId: `med_${i}`,
      name: `${faker.science.chemicalElement().name} ${faker.number.int({ min: 10, max: 1000 })}mg`,
      stock,
      stockLevel: Math.min(100, Math.round((stock / 5000) * 100)), // Normalized 0-100
      expiryDate: faker.date.future({ years: 2 }),
      availability: faker.datatype.boolean(0.9),
      alternativeMedicines: [],
    });
  }
  return medicines;
}

export function generateLabTests(count: number): LabTestEntity[] {
  const tests: LabTestEntity[] = [];
  for (let i = 0; i < count; i++) {
    tests.push({
      testId: `lab_${i}`,
      name: `${faker.helpers.arrayElement(LAB_TEST_NAMES)} - ${faker.science.chemicalElement().name}`,
      price: faker.number.int({ min: 200, max: 15000, multipleOf: 100 }),
      collectionStatus: faker.helpers.arrayElement(['Pending', 'Collected', 'In-Progress', 'Completed']) as any,
      reportStatus: faker.helpers.arrayElement(['Pending', 'Ready', 'Delivered']) as any,
      expectedDelivery: faker.date.soon({ days: 2 }),
    });
  }
  return tests;
}

export function generatePatients(count: number): PatientPreferenceEntity[] {
  const patients: PatientPreferenceEntity[] = [];
  for (let i = 0; i < count; i++) {
    patients.push({
      patientId: `pat_${i}`,
      preferredCity: faker.helpers.arrayElement(CITIES),
      preferredLanguage: faker.helpers.arrayElement(['English', 'Hindi', 'Tamil', 'Telugu']),
      insuranceProvider: faker.helpers.arrayElement(['Star Health', 'HDFC ERGO', 'ICICI Lombard', 'LIC', 'Care Health']),
      updatedAt: faker.date.recent(),
    });
  }
  return patients;
}

export function generateReminders(count: number): ReminderEntity[] {
  const reminders: ReminderEntity[] = [];
  for (let i = 0; i < count; i++) {
    reminders.push({
      reminderId: `rem_${i}`,
      bookingId: `book_${faker.number.int({ min: 0, max: 10000 })}`,
      patientId: `pat_${faker.number.int({ min: 0, max: 1000 })}`,
      type: faker.helpers.arrayElement(['1-day', '1-hour', 'follow-up']) as ReminderType,
      scheduledAt: faker.date.soon({ days: 10 }),
      status: faker.helpers.arrayElement(['pending', 'sent', 'cancelled']) as ReminderStatus,
      createdAt: faker.date.recent(),
    });
  }
  return reminders;
}

export function generateIncidents(count: number): IncidentEntity[] {
  const incidents: IncidentEntity[] = [];
  for (let i = 0; i < count; i++) {
    incidents.push({
      incidentId: `inc_${i}`,
      condition: faker.helpers.arrayElement(['Severe Chest Pain', 'Road Traffic Accident', 'Stroke', 'Cardiac Arrest', 'Mass Casualty', 'Dengue Outbreak']),
      severity: faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']) as any,
      status: faker.helpers.arrayElement(['Active', 'Resolved', 'Escalated']) as any,
      reportedAt: faker.date.recent(),
      hospital: faker.helpers.arrayElement(HOSPITALS),
    });
  }
  return incidents;
}
