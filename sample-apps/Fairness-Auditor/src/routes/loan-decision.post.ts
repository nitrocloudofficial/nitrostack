import { defineEventHandler, readBody } from 'h3';
import { LoanDecisionTool } from '../modules/loan-decision/evaluate_loan.tool.js';
import { PolicyService } from '../modules/policy/policy.service.js';
import { DynamicFieldSanitizerPipe } from '../modules/policy/sanitizer.pipe.js';
import { DecisionCalibratorInterceptor } from '../modules/policy/calibrator.interceptor.js';

const policyService = new PolicyService();
const sanitizerPipe = new DynamicFieldSanitizerPipe(policyService);
const calibratorInterceptor = new DecisionCalibratorInterceptor(policyService);
const loanTool = new LoanDecisionTool();

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  // 1. Pipe: Dynamic field redaction driven by Postgres active policy
  const sanitizedInput = await sanitizerPipe.transform(body, { type: 'body' });
  
  // 2. Target Agent tool execution
  const rawResult = await loanTool.evaluateLoanApplication(sanitizedInput);
  
  // 3. Interceptor: Post-processing decision calibration
  const calibratedResult = await calibratorInterceptor.intercept(
    { params: (sanitizedInput as Record<string, unknown>) || {} } as any,
    async () => rawResult
  );

  return calibratedResult;
});