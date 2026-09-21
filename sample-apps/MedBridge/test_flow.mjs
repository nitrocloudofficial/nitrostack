import { MedBridgeService } from './dist/modules/medbridge/medbridge.service.js';

(async () => {
  const svc = new MedBridgeService();
  console.log('Listing patients:');
  console.log(svc.listPatients());

  console.log('\nRegistering doctor session...');
  const session = svc.registerDoctorSession('Test Doctor', 'Test Hospital', 'REG-123', 'test@hospital.example');
  console.log('Session:', session);

  console.log('\nSending OTP to patient P001...');
  const otpRes = await svc.sendPatientOtp('P001', session.sessionId);
  console.log('OTP result (dev only):', otpRes);

  console.log('\nVerifying OTP...');
  const grant = svc.verifyPatientOtp('P001', otpRes.devOtp, session.sessionId, ['hospital_records','lab_reports','pharmacy_records'], 5);
  console.log('Grant:', grant);

  console.log('\nGenerating report...');
  const report = svc.generateReport('P001', session.sessionId);
  console.log('Report id:', report.reportId);

  console.log('\nSharing report (email will be simulated unless SMTP is configured)...');
  await svc.shareReport(report.reportId, session.doctorName, undefined, 'Sharing for demo');
  console.log('Shared.');

  console.log('\nDone');
  process.exit(0);
})();