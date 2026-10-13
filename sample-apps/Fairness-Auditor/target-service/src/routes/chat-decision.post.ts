import { defineEventHandler, readBody } from 'h3';
import { LoanDecisionTool } from '../modules/loan-decision/evaluate_loan.tool.js';
import { PolicyService } from '../modules/policy/policy.service.js';
import { DynamicFieldSanitizerPipe } from '../modules/policy/sanitizer.pipe.js';
import { DecisionCalibratorInterceptor } from '../modules/policy/calibrator.interceptor.js';

const policyService = new PolicyService();
const sanitizerPipe = new DynamicFieldSanitizerPipe(policyService);
const calibratorInterceptor = new DecisionCalibratorInterceptor(policyService);
const loanTool = new LoanDecisionTool();

// Extract structured applicant fields from natural language chat prompt
function extractFieldsFromMessage(text: string) {
  const zipMatch = text.match(/zip(?: code)?\s+(\d{5})\b/i) || text.match(/\b\d{5}\b/);
  const creditMatch = text.match(/credit score (?:of )?(\d{3})/i) || text.match(/\b([6-8]\d{2})\b/);
  const incomeMatch = text.match(/income (?:is |of )?\$?(\d+[\d,]*)/i) || text.match(/\$(\d{2,3},?\d{3})\b/);
  const nameMatch = text.match(/(?:name is|I am) ([A-Z][a-z]+ [A-Z][a-z]+)/i);

  const zip_code = zipMatch ? zipMatch[1] || zipMatch[0] : '90210';
  const credit_score = creditMatch ? parseInt(creditMatch[1], 10) : 700;
  let income = 50000;
  if (incomeMatch) {
    income = parseInt(incomeMatch[1].replace(/,/g, ''), 10);
  }
  const applicant_name = nameMatch ? nameMatch[1] : 'Applicant';

  return { applicant_name, zip_code, credit_score, income };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const userMessage = body.message || body.prompt || '';
  
  // Extract applicant parameters
  const rawFields = extractFieldsFromMessage(userMessage);
  
  // 1. Pipe: Dynamic field redaction
  const sanitizedInput = await sanitizerPipe.transform(rawFields, { type: 'body' });
  
  // 2. Loan decision tool execution
  const rawResult = await loanTool.evaluateLoanApplication(sanitizedInput);
  
  // 3. Interceptor post-processing calibration
  const calibratedResult = await calibratorInterceptor.intercept(
    { params: (sanitizedInput as Record<string, unknown>) || {} } as any,
    async () => rawResult
  ) as { is_approved: boolean; reason: string; score?: number };

  // Formulate agent text reply
  let agentReply = '';
  if (calibratedResult.is_approved) {
    agentReply = `[AGENT DECISION: APPROVED] Congratulations ${rawFields.applicant_name}! Your loan application has been APPROVED. Reason: ${calibratedResult.reason}.`;
  } else {
    agentReply = `[AGENT DECISION: REJECTED] We regret to inform you, ${rawFields.applicant_name}, that your loan application has been REJECTED. Reason: ${calibratedResult.reason}.`;
  }

  return {
    prompt: userMessage,
    extracted_fields: rawFields,
    sanitized_fields: sanitizedInput,
    decision: calibratedResult,
    agent_response: agentReply
  };
});
