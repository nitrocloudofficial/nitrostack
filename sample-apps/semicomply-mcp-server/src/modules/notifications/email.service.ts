import { Injectable } from '@nitrostack/core';
import { EmailMessage, EmailProvider, EmailResult, SmtpProvider } from './email.provider.js';

@Injectable({ deps: [] })
export class EmailService {
    private provider: EmailProvider;

    constructor() {
        this.provider = new SmtpProvider();
    }

    setProvider(provider: EmailProvider): void {
        this.provider = provider;
    }

    send(message: EmailMessage): Promise<EmailResult> {
        return this.provider.send(message);
    }

    verify(): Promise<boolean> {
        return this.provider.verify();
    }
}
