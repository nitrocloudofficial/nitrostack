import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { IntakeOrchestratorService } from '../../../../../services/intake/intake-orchestrator.service';

export async function POST() {
  try {
    const timestamp = Date.now().toString().slice(-4);
    const sampleInput = {
      senderEmail: 'reception.central@cityhospital.org',
      subject: `FWD: Patient Registration Package #${timestamp}`,
      attachments: [
        {
          fileName: `Patient_Registration_Form_${timestamp}.pdf`,
          documentType: 'Registration Form',
          textContent: `
PATIENT REGISTRATION & INTAKE FORM
Name: Intake Patient ${timestamp}
DOB: 1988-06-20 | Age: 38 | Gender: Female
Phone: +1 (555) ${timestamp}-9012 | Email: patient.${timestamp}@example.com
Address: 100 Hospital Way, Suite ${timestamp}
Emergency Contact: Primary Guardian, Phone: +1 (555) ${timestamp}-0000
Blood Group: A+
Insurance: Blue Cross Shield (Policy: BC-${timestamp}, Group: GRP-${timestamp})
`
        },
        {
          fileName: `Insurance_Card_${timestamp}.png`,
          documentType: 'Insurance',
          textContent: `
BLUE CROSS HEALTH PLAN
Subscriber: Intake Patient ${timestamp}
Policy ID: BC-${timestamp} | Group: GRP-${timestamp}
Primary Physician: Attending Physician
`
        },
        {
          fileName: `Clinical_History_${timestamp}.pdf`,
          documentType: 'Medical Reports',
          textContent: `
CLINICAL SUMMARY & HISTORY
Known Allergies: Latex, Amoxicillin
Medical History: Asthma, Seasonal Allergies
Current Medication: Albuterol 90mcg Inhaler PRN
Vitals: BP Systolic: 122, BP Diastolic: 78, Heart Rate: 74, Resp Rate: 16, Temperature: 98.6, SpO2: 99%
`
        }
      ]
    };

    const result = await IntakeOrchestratorService.processAutonomousIntake(sampleInput);

    return NextResponse.json({
      status: 'success',
      message: 'Autonomous patient intake simulation completed successfully!',
      package: result.packageEntity,
      extractedPatient: result.extractedProfile
    });
  } catch (error: any) {
    console.error('Error triggering sample intake:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
