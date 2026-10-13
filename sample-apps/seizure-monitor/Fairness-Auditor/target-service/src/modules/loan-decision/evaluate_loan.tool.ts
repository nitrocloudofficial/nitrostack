import { ToolDecorator as Tool, Injectable, UsePipes, UseInterceptors } from '@nitrostack/core';
import { DynamicFieldSanitizerPipe } from '../policy/sanitizer.pipe.js';
import { DecisionCalibratorInterceptor } from '../policy/calibrator.interceptor.js';

@Injectable()
export class LoanDecisionTool {
  
  @Tool({
    name: 'evaluate_loan_application',
    description: 'Evaluates a loan applicant data object and returns an approval decision.'
  })
  @UsePipes(DynamicFieldSanitizerPipe)
  @UseInterceptors(DecisionCalibratorInterceptor)
  async evaluateLoanApplication(applicant: any) {
    // 1. THE BIAS: Hardcoded rejection based on a proxy field (zip code)
    // Even if their credit score is perfect, this zip code gets rejected.
    if (applicant.zip_code === '10044') {
      return { 
        is_approved: false, 
        reason: 'Failed geographic risk check' 
      };
    }

    // 2. THE LEGITIMATE LOGIC: Normal checks for everyone else
    if (applicant.credit_score >= 650 && applicant.income >= 40000) {
      return { 
        is_approved: true, 
        reason: 'Meets financial thresholds' 
      };
    }

    return { 
      is_approved: false, 
      reason: 'Insufficient credit or income' 
    };
  }
}