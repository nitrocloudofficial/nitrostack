export type UserRole = 'Worker' | 'Admin' | 'Bank' | 'Nominee';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  aadhaar_number?: string;
  pan_number?: string;
  is_active: boolean;
  created_at: string;
}

export interface GigProfile {
  id: number;
  user_id: number;
  primary_platform: string;
  secondary_platforms?: string;
  city_tier: string;
  gig_tenure_months: number;
  platform_rating: number;
  order_completion_rate: number;
  avg_monthly_income: number;
  fuel_ratio: number;
  expense_ratio: number;
  savings_ratio: number;
  working_hours: number;
  bank_account_no: string;
  upi_id: string;
}

export interface CreditScoreResult {
  credit_score: number;
  risk_level: string;
  eligible_loan: number;
  recommended_daily_repayment: number;
  confidence_score: number;
  interest_rate: number;
  max_tenure_months: number;
  underwriting_metrics: {
    income_velocity_score: number;
    cashflow_stability_score: number;
    savings_burn_index: number;
    platform_performance_multiplier: number;
  };
}

export interface Loan {
  id: number;
  user_id: number;
  principal_amount: number;
  total_repayable: number;
  interest_rate: number;
  tenure_months: number;
  daily_repayment_amount: number;
  remaining_balance: number;
  status: 'Pending' | 'Approved' | 'Active' | 'Completed' | 'Paused' | 'Rejected';
  created_at: string;
}

export interface RepaymentRecord {
  id: number;
  loan_id: number;
  user_id: number;
  scheduled_date: string;
  paid_date?: string;
  amount: number;
  payment_mode: string;
  status: 'Paid' | 'Skipped' | 'SmartPaused' | 'Failed';
  smart_pause_reason?: string;
  txn_ref?: string;
}

export interface InvoiceVerification {
  sha256_hash: string;
  duplicate_detected: boolean;
  verification_status: string;
  gst_verified: boolean;
  eway_bill_verified: boolean;
  logistics_verified: boolean;
  merchant_verified: boolean;
  risk_score: number;
  message: string;
}

export interface Nominee {
  id: number;
  user_id: number;
  nominee_name: string;
  relationship: string;
  aadhaar_number: string;
  phone: string;
  email?: string;
  bank_account_no: string;
  ifsc_code: string;
  share_percentage: number;
  is_verified: boolean;
}

export interface SuccessionRescue {
  confirmed: boolean;
  deceased_name: string;
  death_certificate_no: string;
  assets: Array<{
    id: number;
    type: string;
    institution: string;
    account: string;
    value: number;
    status: string;
  }>;
  total_asset_value: number;
  claim_id: string;
  claim_status: string;
  generated_forms: string[];
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  channel: 'SMS' | 'Email' | 'Push';
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  created_at: string;
}

export interface AnalyticsDashboard {
  total_workers: number;
  total_loans_disbursed: number;
  active_loans_count: number;
  fraud_attempts_blocked: number;
  succession_claims_processed: number;
  repayment_rate: number;
  loan_statistics: any;
  income_trends: any[];
  repayment_trends: any[];
  fraud_attempts: any[];
  risk_distribution: any;
}
