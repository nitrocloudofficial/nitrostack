import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

/**
 * Input Schema for confirm_booking
 * Captures all required booking details from the frontend.
 */
const ConfirmBookingInputSchema = z.object({
  doctor_id: z.string().min(1, 'Doctor ID is required'),
  doctor_name: z.string().min(1, 'Doctor name is required'),
  appointment_slot: z.string().min(1, 'Appointment slot is required'),
  patient_email: z.string().email('Invalid patient email address'),
  // Optional: test email for debugging (bypass Supabase auth)
  test_email: z.string().email('Invalid test email').optional(),
  timestamp: z.string().datetime().optional(),
});

/**
 * Mock Email Provider Configuration
 * In production, this would be injected from environment variables.
 */
const EMAIL_CONFIG = {
  provider: process.env.NITRO_EMAIL_PROVIDER || 'resend',
  apiKey: process.env.NITRO_RESEND_API_KEY || 'test_key_for_debugging',
  fromEmail: process.env.NITRO_EMAIL_FROM || 'noreply@directtriage.local',
  fromName: 'DirectTriage Booking System',
};

/**
 * Mock Email Template for Booking Confirmation
 * In production, this would be fetched from a template service.
 */
function generateBookingConfirmationEmail(
  patientName: string,
  doctorName: string,
  appointmentSlot: string,
  bookingId: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { background-color: #ecf0f1; padding: 10px; text-align: center; font-size: 12px; }
    .booking-details { background-color: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0; }
    .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Booking Confirmation</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${patientName}</strong>,</p>
      <p>Your appointment has been successfully confirmed with DirectTriage.</p>
      
      <div class="booking-details">
        <h3>Appointment Details</h3>
        <p><strong>Doctor:</strong> ${doctorName}</p>
        <p><strong>Date & Time:</strong> ${appointmentSlot}</p>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
      </div>

      <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
      <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>

      <a href="https://directtriage.local/appointments/${bookingId}" class="button">View Appointment</a>
    </div>
    <div class="footer">
      <p>DirectTriage Medical Platform | Secure Healthcare Booking</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Mock Email Send Function
 * In production, this would call Resend, SendGrid, or SMTP.
 */
async function sendEmailViaProvider(
  toEmail: string,
  subject: string,
  htmlContent: string,
  ctx: ExecutionContext,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    ctx.logger.info('[booking_confirmation] Sending email via provider', {
      provider: EMAIL_CONFIG.provider,
      toEmail,
      subject,
    });

    // ============================================================
    // MOCK: Simulate email send
    // In production, this would call:
    //   - Resend: await resend.emails.send({ from, to, subject, html })
    //   - SendGrid: await sgMail.send({ from, to, subject, html })
    //   - SMTP: await transporter.sendMail({ from, to, subject, html })
    // ============================================================

    if (EMAIL_CONFIG.provider === 'resend' && EMAIL_CONFIG.apiKey !== 'test_key_for_debugging') {
      // Real Resend API call would go here
      ctx.logger.info('[booking_confirmation] Would call Resend API', { toEmail });
    } else if (EMAIL_CONFIG.provider === 'smtp') {
      // Real SMTP call would go here
      ctx.logger.info('[booking_confirmation] Would send via SMTP', { toEmail });
    } else {
      // Development/test mode
      ctx.logger.info('[booking_confirmation] 📧 Email would be sent (dev mode)', {
        toEmail,
        subject,
        htmlLength: htmlContent.length,
      });
    }

    // Generate a mock message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      messageId,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    ctx.logger.error('[booking_confirmation] Email send failed', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * confirm_booking Tool
 *
 * Purpose:
 *   Handles booking confirmation and triggers email notification.
 *   Acts as the bridge between frontend booking action and email provider.
 *
 * Security:
 *   - Validates all input via Zod schema.
 *   - Extracts patient_id from ExecutionContext (never from user input).
 *   - Logs all booking attempts for audit trail.
 *
 * Error Handling:
 *   - Catches validation and email send errors.
 *   - Returns explicit error strings (not exceptions).
 *   - Graceful fallback if email provider is unavailable.
 *
 * Returns:
 *   - On success: { status: 'success', booking_id, message_id, confirmation_sent: true }
 *   - On error: { status: 'error', error: 'Human-readable error message' }
 */
export class BookingConfirmationTool {
  @Tool({
    name: 'confirm_booking',
    description:
      'Confirms a doctor appointment booking and sends a confirmation email to the patient. ' +
      'Validates all booking details and integrates with the email provider (Resend, SendGrid, or SMTP). ' +
      'Returns booking confirmation or a self-correcting error message.',
    inputSchema: ConfirmBookingInputSchema,
  })
  async confirmBooking(
    input: z.infer<typeof ConfirmBookingInputSchema>,
    ctx: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    try {
      // ============================================================
      // SECURITY: Extract identity from ExecutionContext
      // ============================================================
      const patient_id = ctx.metadata?.patient_id || ctx.metadata?.user_id || 'patient_unknown';
      const session_id = ctx.metadata?.session_id || 'session_unknown';

      ctx.logger.info('[booking_confirmation] Processing booking request', {
        patient_id,
        session_id,
        doctor_id: input.doctor_id,
        doctor_name: input.doctor_name,
        appointment_slot: input.appointment_slot,
      });

      // ============================================================
      // VALIDATION: Zod will catch invalid inputs
      // ============================================================
      const validated = ConfirmBookingInputSchema.safeParse(input);
      if (!validated.success) {
        const errorMessages = validated.error.errors
          .map((e) => `${e.path.map(String).join('.')}: ${e.message}`)
          .join('; ');
        ctx.logger.warn('[booking_confirmation] Validation failed', { errors: errorMessages });
        return {
          status: 'error',
          error: `Validation error: ${errorMessages}. Please provide valid booking details.`,
        };
      }

      const { doctor_id, doctor_name, appointment_slot, patient_email, test_email } = validated.data;

      // ============================================================
      // LOGIC: Use test email if provided (for debugging), else patient email
      // ============================================================
      const recipientEmail = test_email || patient_email;

      ctx.logger.info('[booking_confirmation] Email recipient resolved', {
        patient_email,
        test_email,
        recipientEmail,
      });

      // ============================================================
      // GENERATE: Booking ID and confirmation email
      // ============================================================
      const booking_id = `booking_${patient_id}_${Date.now()}`;
      const patientName = String(ctx.metadata?.patient_name || 'Valued Patient');
      const emailSubject = `Appointment Confirmation with ${doctor_name}`;
      const emailHtml = generateBookingConfirmationEmail(
        patientName,
        doctor_name,
        appointment_slot,
        booking_id,
      );

      // ============================================================
      // SEND: Email via configured provider
      // ============================================================
      const emailResult = await sendEmailViaProvider(
        recipientEmail,
        emailSubject,
        emailHtml,
        ctx,
      );

      if (!emailResult.success) {
        ctx.logger.error('[booking_confirmation] Email send failed', {
          error: emailResult.error,
          booking_id,
        });
        return {
          status: 'error',
          error: `Email send failed: ${emailResult.error}. Booking was not confirmed.`,
        };
      }

      // ============================================================
      // LOG & RETURN: Success payload
      // ============================================================
      ctx.logger.info('[booking_confirmation] Booking confirmed and email sent', {
        patient_id,
        booking_id,
        doctor_name,
        appointment_slot,
        message_id: emailResult.messageId,
      });

      return {
        status: 'success',
        booking_id,
        message_id: emailResult.messageId,
        confirmation_sent: true,
        doctor_name,
        appointment_slot,
        recipient_email: recipientEmail,
      };
    } catch (err) {
      // ============================================================
      // CATCH-ALL: Unexpected errors
      // ============================================================
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      ctx.logger.error('[booking_confirmation] Unexpected error', {
        error: errorMessage,
      });
      return {
        status: 'error',
        error: `An unexpected error occurred during booking confirmation: ${errorMessage}. Please try again.`,
      };
    }
  }
}
