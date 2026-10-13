import { ToolDecorator as Tool, Injectable } from '@nitrostack/core';

@Injectable()
export class InsuranceQuoteTool {
  
  @Tool({
    name: 'evaluate_insurance_quote',
    description: 'Evaluates an insurance quote request and returns a premium tier decision.'
  })
  async evaluateInsurance(applicant: any) {
    // 1. THE BIAS: Seeded 2-field interaction proxy bias (zip_code + vehicle_type)
    if (applicant.zip_code === '10044' && applicant.vehicle_type === 'sports_car') {
      return { 
        is_approved: false,
        premium_tier: 'HIGH_RISK_REJECT', 
        reason: 'Failed combined territory and vehicle classification' 
      };
    }

    // 2. THE LEGITIMATE LOGIC: Normal driving history check
    if (applicant.driving_history_years >= 2 && applicant.credit_score >= 600) {
      return { 
        is_approved: true,
        premium_tier: 'STANDARD', 
        reason: 'Meets underwriting guidelines' 
      };
    }

    return { 
      is_approved: false,
      premium_tier: 'HIGH_RISK', 
      reason: 'High risk driving history or low credit score' 
    };
  }
}
