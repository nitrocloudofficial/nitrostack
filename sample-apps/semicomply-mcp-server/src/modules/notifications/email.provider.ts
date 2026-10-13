import nodemailer from 'nodemailer';

export interface EmailMessage {
    to: string[];
    cc?: string[];
    subject: string;
    html: string;
    text: string;
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface EmailProvider {
    send(message: EmailMessage): Promise<EmailResult>;
    verify(): Promise<boolean>;
}

export class SmtpProvider implements EmailProvider {
    private transporter: nodemailer.Transporter | null = null;

    private getTransporter(): nodemailer.Transporter {
        if (this.transporter) return this.transporter;

        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            throw new Error(
                'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env. ' +
                'For Gmail, use smtp.gmail.com with an app password.',
            );
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });

        return this.transporter;
    }

    async send(message: EmailMessage): Promise<EmailResult> {
        try {
            const info = await this.getTransporter().sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: message.to.join(', '),
                cc: message.cc?.length ? message.cc.join(', ') : undefined,
                subject: message.subject,
                html: message.html,
                text: message.text,
            });

            return { success: true, messageId: info.messageId };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    async verify(): Promise<boolean> {
        try {
            await this.getTransporter().verify();
            return true;
        } catch {
            return false;
        }
    }
}
