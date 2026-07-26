import mongoose from 'mongoose';
import {
  Injectable,
  ConfigService,
  type OnModuleInit,
  type OnApplicationShutdown,
} from '@nitrostack/core';
import { DoctorModel } from './schemas/doctor.schema.js';
import { SlotModel } from './schemas/slot.schema.js';
import { AppointmentModel } from './schemas/appointment.schema.js';
import { ReminderModel } from './schemas/reminder.schema.js';
import { PatientPreferenceModel } from './schemas/patient-preference.schema.js';
import { BedModel } from './schemas/bed.schema.js';
import { MedicineModel } from './schemas/medicine.schema.js';
import { LabTestModel } from './schemas/lab-test.schema.js';
import { SEED_DOCTORS, buildSeedSlots } from './seed-data.js';
import { generateDoctors, generateBeds, generateMedicines, generateLabTests, generateSlots, generateAppointments, generatePatients, generateReminders, generateIncidents } from './seed-generator.js';
import { IncidentModel } from './schemas/incident.schema.js';

/**
 * Owns the single Mongoose connection for the whole MCP server and guarantees
 * demo data exists before any tool runs.
 *
 * Design notes:
 * - `connect()` is idempotent and concurrency-safe: every tool awaits the same
 *   in-flight promise instead of opening a second connection.
 * - Seeding is idempotent (upsert by natural key), so restarts never duplicate
 *   rows and never wipe real appointments.
 * - No `console.*` anywhere: this process speaks MCP over STDIO.
 */
@Injectable({ deps: [ConfigService] })
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private connectionPromise: Promise<void> | null = null;
  private connected = false;

  constructor(private readonly config: ConfigService) {}

  /** Eagerly connect + seed at boot so the first tool call is fast. */
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch {
      // Swallow at boot: a tool call will retry and surface a useful error to
      // the model rather than crashing the server before the handshake.
      this.connectionPromise = null;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.connected) {
      await mongoose.disconnect();
      this.connected = false;
      this.connectionPromise = null;
    }
  }

  /** Resolve the Mongo connection string from env, with a local fallback. */
  private getUri(): string {
    const uri =
      this.config.get<string>('MONGODB_URI') ?? process.env.MONGODB_URI ?? '';

    if (!uri) {
      throw new Error(
        'MONGODB_URI is not configured. Add it to .env before using Arogya tools.',
      );
    }

    return uri;
  }

  /**
   * Connect (once) and ensure the demo directory is seeded.
   * Safe to call from every tool handler.
   */
  async connect(): Promise<void> {
    if (this.connected && mongoose.connection.readyState === 1) return;

    if (!this.connectionPromise) {
      this.connectionPromise = (async () => {
        await mongoose.connect(this.getUri(), {
          dbName: 'health',
          serverSelectionTimeoutMS: 15000,
        });
        this.connected = true;
        await this.ensureSeeded();
      })().catch((error) => {
        this.connectionPromise = null;
        this.connected = false;
        throw error;
      });
    }

    await this.connectionPromise;
  }

  /**
   * Idempotently upsert the seed directory.
   *
   * Doctors are upserted by `doctorId`; slots by `slotId`, and an existing slot
   * keeps its `status`/`bookingId` (we only `$setOnInsert` those) so a restart
   * never silently frees an already booked slot.
   */
  private async ensureSeeded(): Promise<void> {
    const docCount = await DoctorModel.countDocuments();
    if (docCount >= 1000) {
      console.error('[Seeding] Database already heavily populated. Skipping massive generation to save boot time.');
      return;
    }

    console.error('[Seeding] Generating massive Faker dataset...');
    const allDoctors = generateDoctors(1200);
    const slots = generateSlots(allDoctors, 10000);
    const beds = generateBeds(1000);
    const meds = generateMedicines(1000);
    const labs = generateLabTests(500);
    const patients = generatePatients(1000);
    const appointments = generateAppointments(slots, 5000);
    const reminders = generateReminders(1000);
    const incidents = generateIncidents(500);

    const chunkArray = <T>(arr: T[], size: number): T[][] =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

    const upsertChunks = async <T, R>(items: T[], getOp: (item: T) => any, model: mongoose.Model<R>) => {
      const chunks = chunkArray(items, 2000);
      for (const chunk of chunks) {
        const ops = chunk.map(getOp);
        if (ops.length > 0) await model.bulkWrite(ops, { ordered: false });
      }
    };

    console.error('[Seeding] Inserting Doctors...');
    await upsertChunks(allDoctors, (d) => ({ updateOne: { filter: { doctorId: d.doctorId }, update: { $set: d }, upsert: true } }), DoctorModel);

    console.error('[Seeding] Inserting Slots...');
    await upsertChunks(slots, (s) => ({
      updateOne: { filter: { slotId: s.slotId }, update: { $set: s }, upsert: true }
    }), SlotModel);

    console.error('[Seeding] Inserting Beds...');
    await upsertChunks(beds, (b) => ({ updateOne: { filter: { bedId: b.bedId }, update: { $set: b }, upsert: true } }), BedModel);

    console.error('[Seeding] Inserting Medicines...');
    await upsertChunks(meds, (m) => ({ updateOne: { filter: { medicineId: m.medicineId }, update: { $set: m }, upsert: true } }), MedicineModel);

    console.error('[Seeding] Inserting Lab Tests...');
    await upsertChunks(labs, (l) => ({ updateOne: { filter: { testId: l.testId }, update: { $set: l }, upsert: true } }), LabTestModel);

    console.error('[Seeding] Inserting Patients...');
    await upsertChunks(patients, (p) => ({ updateOne: { filter: { patientId: p.patientId }, update: { $set: p }, upsert: true } }), PatientPreferenceModel);

    console.error('[Seeding] Inserting Appointments...');
    await upsertChunks(appointments, (a) => ({ updateOne: { filter: { bookingId: a.bookingId }, update: { $set: a }, upsert: true } }), AppointmentModel);

    console.error('[Seeding] Inserting Reminders...');
    await upsertChunks(reminders, (r) => ({ updateOne: { filter: { reminderId: r.reminderId }, update: { $set: r }, upsert: true } }), ReminderModel);

    console.error('[Seeding] Inserting Incidents...');
    await upsertChunks(incidents, (i) => ({ updateOne: { filter: { incidentId: i.incidentId }, update: { $set: i }, upsert: true } }), IncidentModel);

    console.error(`[Seeding] Complete! Final Counts:
      Doctors: ${await DoctorModel.countDocuments()}
      Medicines: ${await MedicineModel.countDocuments()}
      Beds: ${await BedModel.countDocuments()}
      Slots: ${await SlotModel.countDocuments()}
      Lab Tests: ${await LabTestModel.countDocuments()}
      Appointments: ${await AppointmentModel.countDocuments()}
      Patients: ${await PatientPreferenceModel.countDocuments()}
      Incidents: ${await IncidentModel.countDocuments()}
      Reminders: ${await ReminderModel.countDocuments()}
    `);
  }

  /** Doctor directory collection (connection guaranteed). */
  async doctors(): Promise<typeof DoctorModel> {
    await this.connect();
    return DoctorModel;
  }

  /** Slot inventory collection (connection guaranteed). */
  async slots(): Promise<typeof SlotModel> {
    await this.connect();
    return SlotModel;
  }

  /** Appointment ledger collection (connection guaranteed). */
  async appointments(): Promise<typeof AppointmentModel> {
    await this.connect();
    return AppointmentModel;
  }

  /** Reminders collection */
  async reminders(): Promise<typeof ReminderModel> {
    await this.connect();
    return ReminderModel;
  }

  /** Patient preferences collection */
  async patientPreferences(): Promise<typeof PatientPreferenceModel> {
    await this.connect();
    return PatientPreferenceModel;
  }

  /** Beds collection */
  async beds(): Promise<typeof BedModel> {
    await this.connect();
    return BedModel;
  }

  /** Medicines collection */
  async medicines(): Promise<typeof MedicineModel> {
    await this.connect();
    return MedicineModel;
  }

  /** Lab tests collection */
  async labTests(): Promise<typeof LabTestModel> {
    await this.connect();
    return LabTestModel;
  }
}
