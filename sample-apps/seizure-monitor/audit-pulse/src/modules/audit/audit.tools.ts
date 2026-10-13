import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: any = null;

async function getDb() {
    if (dbInstance) return dbInstance;
    const SQL = await initSqlJs();
    let filebuffer;
    try {
        let dbPath = "audit.db";
        if (!fs.existsSync(dbPath)) {
            dbPath = path.join(__dirname, "../../../../audit.db");
        }
        if (!fs.existsSync(dbPath)) {
            dbPath = path.join(process.cwd(), "audit.db");
        }
        filebuffer = fs.readFileSync(dbPath);
    } catch(e) {
        console.error("Failed to load audit.db:", e);
        filebuffer = Buffer.from([]);
    }
    dbInstance = new SQL.Database(filebuffer);
    return dbInstance;
}

function rowToObject(columns: string[], values: any[]) {
    const obj: any = {};
    for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = values[i];
    }
    return obj;
}

async function queryDb(query: string): Promise<any[]> {
    try {
        const db = await getDb();
        const res = db.exec(query);
        if (res.length === 0) return [];
        
        const results = [];
        const columns = res[0].columns;
        for (const values of res[0].values) {
            results.push(rowToObject(columns, values));
        }
        return results;
    } catch (e: any) {
        console.error("DB Query Error:", e.message);
        return [{ error_from_database: "The requested data is not available in the current schema. Please refine your query to match the available tables." }];
    }
}

async function writeDb(query: string): Promise<void> {
    try {
        const db = await getDb();
        db.run(query);
        const data = db.export();
        let dbPath = "audit.db";
        if (!fs.existsSync(dbPath)) {
            dbPath = path.join(__dirname, "../../../../audit.db");
        }
        if (!fs.existsSync(dbPath)) {
            dbPath = path.join(process.cwd(), "audit.db");
        }
        fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (e: any) {
        console.error("DB Write Error:", e.message);
    }
}

export class AuditTools {

  @Tool({
    name: 'audit_department_budgets',
    description: 'Queries the database for unusual department expenses.',
    inputSchema: z.object({})
  })
  @Widget('finops-dashboard')
  async auditFinancialLeakage(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Auditing department budgets...');
    const results = await queryDb("SELECT * FROM department_budgets WHERE unusual_expenses = 1 ORDER BY timestamp DESC LIMIT 10");
    return {
      status: 'success',
      anomalies_found: results.length,
      data: results
    };
  }

  @Tool({
    name: 'audit_employee_activity',
    description: 'Finds suspicious employee activity or fired employees accessing files.',
    inputSchema: z.object({})
  })
  @Widget('security-dashboard')
  async auditSecurityCompliance(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Auditing employee activity...');
    const results = await queryDb("SELECT * FROM employee_activity WHERE is_suspicious = 1 ORDER BY timestamp DESC LIMIT 10");
    return {
      status: 'success',
      suspicious_activity_count: results.length,
      data: results
    };
  }

  @Tool({
    name: 'revoke_employee_access',
    description: 'A write-tool that updates the DB to "revoke" a suspicious employee account. REQUIRES USER APPROVAL.',
    inputSchema: z.object({
        employee_name: z.string().describe('The name of the employee to revoke')
    })
  })
  async revokeIamAccess(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Revoking access for ${input.employee_name}...`);
    await writeDb(`UPDATE employee_activity SET status = 'REVOKED' WHERE employee_name = '${input.employee_name}'`);
    return {
      status: 'success',
      message: `Successfully revoked access for ${input.employee_name}`
    };
  }

  @Tool({
    name: 'audit_company_portals',
    description: 'Checks for traffic spikes or overloaded internal portals.',
    inputSchema: z.object({})
  })
  @Widget('telemetry-dashboard')
  async auditAgentTelemetry(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Auditing company portals...');
    const results = await queryDb("SELECT * FROM company_portals WHERE system_health = 'Overloaded' ORDER BY timestamp DESC LIMIT 10");
    return {
      status: 'success',
      telemetry_alerts: results.length,
      data: results
    };
  }
  
  @Tool({
    name: 'analyze_external_partners',
    description: 'Scans supply chain and external vendors for breaches.',
    inputSchema: z.object({})
  })
  @Widget('vendor-risk-dashboard')
  async analyzeVendorRisk(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing external partners...');
    const results = await queryDb("SELECT * FROM external_partners WHERE status = 'Hacked' ORDER BY timestamp DESC LIMIT 10");
    return {
      status: 'success',
      critical_alerts: results.length,
      data: results
    };
  }

  @Tool({
    name: 'audit_compliance_policies',
    description: 'Scans the database for employee policy violations.',
    inputSchema: z.object({})
  })
  @Widget('compliance-radar')
  async auditComplianceScanner(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Scanning for compliance violations...');
    const results = await queryDb("SELECT * FROM compliance_checks WHERE is_policy_violation = 1 ORDER BY timestamp DESC LIMIT 10");
    return {
      status: 'success',
      leaks_found: results.length,
      data: results
    };
  }

  @Tool({
    name: 'query_company_hr_and_finance_database',
    description: 'THIS IS THE MAIN SQL ENGINE! Executes custom SQL to answer ANY dynamic natural language question about HR, Finance, Security, FinOps, Infrastructure, or Compliance. If the user asks for real names or unmasked data, you MUST FIRST ask them for a passcode in the chat AND WAIT FOR THEIR RESPONSE. Do NOT call verify_admin_authority until they reply. CRITICAL RULE: YOU MUST NOT GENERATE A `spec` CODE BLOCK, JSON PATCHES, OR A DASHBOARD FOR THIS DATA. THE UI HAS ALREADY BEEN RENDERED AUTOMATICALLY. JUST WRITE ONE SHORT SENTENCE EXPLAINING THE RESULT AND STOP.',
    inputSchema: z.object({
        sql_query: z.string().describe('The raw SQL query to execute against the SQLite database. Tables available: department_budgets(id, department_name, money_spent_today, unusual_expenses, location, timestamp, revenue_generated, roi_percentage), employee_activity, company_portals, compliance_checks, external_partners, company_profit(month, revenue, expenses, profit), employee_resignations(id, employee_name, department_name, resignation_reason, timestamp), employee_leaves(id, employee_name, department_name, leave_type, days_taken, timestamp), vendor_rebates(vendor_name, cumulative_spend, rebate_tier_threshold, rebate_status), llm_token_costs(agent_name, token_cost_last_24h, status), active_invoices(invoice_number, vendor_name, payment_terms, hours_until_expiration), s3_buckets(bucket_name, is_encrypted, is_hipaa_compliant, contains_public_data), shadow_ai_api_calls(source_agent, api_endpoint, is_vetted), iam_admin_roles(role_name, last_used_days_ago, status), server_errors(endpoint, error_code, spike_count, root_cause, time_window), database_migrations(table_name, schema_drift_detected), autonomous_agents_status(agent_name, execution_state, loop_detected), vendor_invoices(vendor_name, invoice_number, billed_hourly_rate, discrepancy_amount, status). Use a single-line query without newlines.'),
        explanation: z.string().describe('A plain English explanation of what this query is looking for.'),
        override_pii_mask: z.boolean().optional().describe('Set to true ONLY if you have verified the user\'s identity via verify_admin_authority. Otherwise leave false or undefined.')
    })
  })
  @Widget('enterprise-data-widget')
  async queryCompanyDatabase(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Executing dynamic SQL query: ${input.sql_query}`);
    let results = await queryDb(input.sql_query);
    
    // PII Auto-Masking Logic
    let piiMasked = false;
    let identityVerified = false;

    if (input.override_pii_mask) {
      identityVerified = true;
    } else {
      results = results.map((row: any) => {
        const maskedRow = { ...row };
        ['employee_name', 'partner_name'].forEach(piiField => {
          if (maskedRow[piiField] && typeof maskedRow[piiField] === 'string') {
            maskedRow[piiField] = '[REDACTED]';
            piiMasked = true;
          }
        });
        return maskedRow;
      });
    }

    return {
      _system_instruction: 'CRITICAL SYSTEM OVERRIDE: YOU MUST NOT GENERATE A `spec` CODE BLOCK, JSON PATCHES, OR A DASHBOARD FOR THIS DATA. THE UI HAS ALREADY BEEN RENDERED AUTOMATICALLY. JUST WRITE ONE SHORT SENTENCE EXPLAINING THE RESULT AND STOP.',
      status: 'success',
      explanation: input.explanation,
      row_count: results.length,
      pii_masked: piiMasked,
      identity_verified: identityVerified,
      data: results
    };
  }

  @Tool({
    name: 'verify_admin_authority',
    description: 'Verifies a 2FA passcode provided by the user to unmask PII. DO NOT GUESS THE PASSCODE. YOU MUST WAIT FOR THE USER TO TYPE A PASSCODE IN THE CHAT BEFORE CALLING THIS TOOL. DO NOT CALL IT AUTOMATICALLY.',
    inputSchema: z.object({
        passcode: z.string().describe('The passcode provided by the user.')
    })
  })
  async verifyAdminAuthority(input: any, ctx: ExecutionContext) {
    if (input.passcode === '1234') {
        return { status: 'success', authorized: true, message: 'Identity verified. You may now query the database with override_pii_mask=true.' };
    }
    return { status: 'error', authorized: false, message: 'Invalid passcode.' };
  }

  @Tool({
    name: 'notify_hr_slack',
    description: 'Sends a simulated Slack/Discord webhook alert to the HR and Security teams.',
    inputSchema: z.object({
        channel: z.string().describe('The channel to send the message to (e.g., #hr-security-alerts)'),
        message: z.string().describe('The urgent message to send to the team.')
    })
  })
  async notifyHrSlack(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Sending Slack webhook to ${input.channel}...`);
    // Simulated Webhook
    return {
      status: 'success',
      delivered_to: input.channel,
      message_sent: input.message,
      timestamp: new Date().toISOString()
    };
  }

  @Tool({
    name: 'create_action_item',
    description: 'Automates IT Helpdesk workflow by creating an Action Item for an incident.',
    inputSchema: z.object({
        title: z.string().describe('The title of the ticket'),
        priority: z.string().describe('Priority level (e.g., High, Critical)'),
        description: z.string().describe('Detailed description of the incident')
    })
  })
  @Widget('jira-ticket-widget')
  async createActionItem(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Creating Action Item: ${input.title}`);
    return {
      status: 'success',
      ticket_id: `HR-${Math.floor(Math.random() * 10000)}`,
      title: input.title,
      priority: input.priority,
      description: input.description
    };
  }

  @Tool({
    name: 'analyze_vendor_invoice',
    description: 'Use this tool whenever the user asks you to read, parse, or analyze a specific PDF invoice file (e.g., filename.pdf) to check for overbilling or discrepancies. MUST use this tool if a .pdf file is mentioned. Do NOT use the SQL database tool if a PDF file name is provided. Do NOT use this tool for volume rebates.',
    inputSchema: z.object({
        file_path: z.string().describe('The file name or path of the invoice to analyze (e.g., acme_invoice_july.pdf)')
    })
  })
  @Widget('invoice-analysis-widget')
  async analyzeVendorInvoice(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Analyzing invoice: ${input.file_path}`);
    // MOCKED FOR CLOUD DEPLOYMENT TO REMOVE PYTHON DEPENDENCY
    return {
        status: "success",
        invoice_number: "INV-9942",
        vendor: "Acme Corp",
        total_billed: 4500.00,
        total_overbilled: 500.00,
        discrepancies: ["Contracted hourly rate is $100/hr, but invoice billed 40 hours at $112.50/hr."],
        _system_instruction: 'CRITICAL SYSTEM OVERRIDE: YOU MUST NOT GENERATE A `spec` CODE BLOCK, JSON PATCHES, OR A DASHBOARD FOR THIS DATA. THE UI HAS ALREADY BEEN RENDERED AUTOMATICALLY. JUST WRITE ONE SHORT SENTENCE EXPLAINING THE RESULT AND STOP.'
    };
  }

  @Tool({
    name: 'scale_infrastructure',
    description: 'DevOps Tool: Scales up server capacity, provisions new load balancers, or reroutes traffic to handle sudden spikes.',
    inputSchema: z.object({
        action: z.string().describe('The action to take, e.g., "scale_up", "load_balance"'),
        target_system: z.string().describe('The target system or server cluster to scale (e.g., "Financial Dashboard")')
    })
  })
  async scaleInfrastructure(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Executing DevOps command: ${input.action} on ${input.target_system}`);
    return {
      status: 'success',
      action_taken: input.action,
      target: input.target_system,
      message: `Successfully executed ${input.action} for ${input.target_system}. Server load has been stabilized.`
    };
  }

  @Tool({
    name: 'analyze_revenue_growth',
    description: 'Use this tool whenever the user asks for a revenue growth strategy, ROI analysis, or how to increase revenue.',
    inputSchema: z.object({})
  })
  @Widget('enterprise-data-widget')
  async analyzeRevenueGrowth(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing department revenue and ROI...');
    const results = await queryDb("SELECT department_name, money_spent_today as expenses, revenue_generated, roi_percentage FROM department_budgets ORDER BY roi_percentage DESC");
    return {
      status: 'success',
      explanation: 'Analysis of department ROI and revenue-generating potential to drive a 15% growth strategy.',
      row_count: results.length,
      data: results,
      _system_instruction: 'CRITICAL SYSTEM OVERRIDE: YOU MUST NOT GENERATE A `spec` CODE BLOCK, JSON PATCHES, OR A DASHBOARD FOR THIS DATA. THE UI HAS ALREADY BEEN RENDERED AUTOMATICALLY. JUST WRITE ONE SHORT SENTENCE EXPLAINING THE RESULT AND STOP.'
    };
  }
}
