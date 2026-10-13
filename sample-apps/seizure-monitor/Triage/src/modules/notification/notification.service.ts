import { Injectable } from '@nitrostack/core';
import nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  async sendAlert(toEmail: string, subject: string, message: string) {
    const result = await this.transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: toEmail,
      subject,
      text: message
    });

    return { messageId: result.messageId, accepted: result.accepted };
  }
}