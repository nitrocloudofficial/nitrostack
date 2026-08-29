import { ToolDecorator as Tool, ExecutionContext, z, Widget } from '@nitrostack/core';
import nodemailer from 'nodemailer';

export class ReportTools {
  @Widget('investment-report')
  @Tool({
    name: 'generate_investment_report',
    description: 'Aggregates findings into a comprehensive AI investment report.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol'),
      summary: z.string().describe('Executive summary text'),
      recommendation: z.enum(['BUY', 'HOLD', 'SELL']).describe('Final investment recommendation')
    })
  })
  async generateReport(
    input: { ticker: string; summary: string; recommendation: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Generating final investment report for ${input.ticker}`);
    
    // In a real scenario, this could generate a PDF or a comprehensive markdown document
    return {
      title: `${input.ticker.toUpperCase()} Investment Analysis Report`,
      date: new Date().toISOString().split('T')[0],
      recommendation: input.recommendation,
      executiveSummary: input.summary,
      status: 'success'
    };
  }

  @Tool({
    name: 'email_investment_report',
    description: 'Emails an investment report to a specified address.',
    inputSchema: z.object({
      emailAddress: z.string().describe('The recipient email address'),
      ticker: z.string().describe('The stock ticker symbol'),
      reportContent: z.string().describe('The full text or summary of the report to email')
    })
  })
  async emailReport(
    input: { emailAddress: string; ticker: string; reportContent: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Attempting to email report for ${input.ticker} to ${input.emailAddress}`);

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      ctx.logger.warn('Gmail credentials not found in environment variables. Skipping email integration.');
      return {
        status: 'skipped',
        message: 'Email integration is currently disabled (GMAIL_USER or GMAIL_APP_PASSWORD not set). No email was sent.'
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });

      const mailOptions = {
        from: `"FinPilot AI" <${user}>`,
        to: input.emailAddress,
        subject: `FinPilot Analysis: ${input.ticker.toUpperCase()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px;">
            <h1 style="color: #6366f1; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">FinPilot Investment Report</h1>
            <h2 style="color: #f8fafc;">Ticker: ${input.ticker.toUpperCase()}</h2>
            <div style="background: rgba(255,255,255,0.05); padding: 24px; border-radius: 8px; border-left: 4px solid #10b981; line-height: 1.6; white-space: pre-wrap;">
              ${input.reportContent}
            </div>
            <p style="margin-top: 32px; font-size: 12px; color: #64748b; text-align: center;">Generated automatically by FinPilot MCP</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      ctx.logger.info('Email sent successfully.');
      return { status: 'success', message: `Report successfully emailed to ${input.emailAddress}` };
    } catch (e: any) {
      ctx.logger.error(`Failed to send email: ${e.message}`);
      return { status: 'error', message: `Failed to send email: ${e.message}` };
    }
  }
}
