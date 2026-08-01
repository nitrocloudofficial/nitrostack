import { IntakeRepository } from '../../db/repositories/intake.repository.js';
import { AuditRepository } from '../../db/repositories/audit.repository.js';

export interface IntakeNotification {
  packageId: string;
  packageNumber: string;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  patientName?: string;
  status: string;
}

export class NotificationAgent {
  static getPendingNotificationCount(): number {
    const pendingPackages = IntakeRepository.getPackages('PENDING_VERIFICATION');
    return pendingPackages.length;
  }

  static getRecentNotifications(): IntakeNotification[] {
    const pkgs = IntakeRepository.getPackages();
    return pkgs.map(p => {
      let patientName = 'Pending Extraction';
      if (p.extractedPatient) {
        try {
          const parsed = JSON.parse(p.extractedPatient);
          patientName = parsed.name || 'Unknown Patient';
        } catch (e) {}
      }
      return {
        packageId: p.id,
        packageNumber: p.packageNumber,
        senderEmail: p.senderEmail,
        subject: p.subject,
        receivedAt: p.receivedAt,
        patientName,
        status: p.status
      };
    });
  }

  static notifyDoctorNewPackage(packageNumber: string, senderEmail: string, patientName: string) {
    console.log(`[NotificationAgent] 🔔 ALERT: New Patient Package ${packageNumber} (${patientName}) from ${senderEmail} is awaiting verification.`);
    AuditRepository.log('DOCTOR_INTAKE_NOTIFICATION', 'IntakePackage', packageNumber, {
      senderEmail,
      patientName,
      message: 'New patient intake package awaiting doctor verification.'
    });
  }
}
