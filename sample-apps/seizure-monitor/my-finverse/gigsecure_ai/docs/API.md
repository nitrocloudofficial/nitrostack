# GigSecure AI - REST API Specifications

## Authentication
- `POST /auth/register` - Register new worker or bank user
- `POST /auth/login` - Obtain JWT access & refresh token
- `POST /auth/send-otp` - Dispatch 6-digit SMS OTP
- `POST /auth/verify-otp` - Verify SMS OTP token

## AI Credit Underwriting
- `POST /credit-score` - Run trained GradientBoosting ML underwriting model. Returns score (300-850), risk tier, eligible credit limit, recommended daily repayment, and SHAP top factor drivers.

## Multi-Bank Fraud Shield & Invoices
- `POST /invoice/upload` - Fingerprint invoice via SHA-256 and register in central ledger.
- `POST /fraud/check` - Real-time duplicate check across member banks.
- `GET /fraud/history` - Historical fingerprint audit log.
- `GET /fraud/statistics` - Bank breakdown & risk tier distribution.

## Adaptive UPI AutoPay Repayments
- `POST /repayment/process` - Execute daily debit with zero-income Smart-Pause safeguard.
- `POST /repayment/pause/{loan_id}` - Pause repayment cycle.
- `POST /repayment/resume/{loan_id}` - Resume repayment cycle.

## Succession & Nominee Rescue
- `POST /succession/rescue/{nominee_id}` - Query civil death registry & trigger Account Aggregator asset discovery.
- `POST /succession/parse-document` - OCR document reader & LLM parser.
- `GET /succession/claims` - Multi-institution claim progress status.
