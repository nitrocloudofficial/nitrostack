# GigSecure AI - API Specification & Endpoint Documentation

## Base URL
`http://localhost:8000`

## Authentication Header
`Authorization: Bearer <YOUR_JWT_ACCESS_TOKEN>`

## Complete API Catalog

### 1. Authentication (`/auth`)
- `POST /auth/register` - Create user account & auto initialize profile
- `POST /auth/login` - Obtain JWT Access & Refresh Token
- `POST /auth/send-otp` - Dispatch 6-digit SMS OTP (Mock demo)
- `POST /auth/verify-otp` - Verify SMS OTP and login
- `POST /auth/refresh` - Refresh access token

### 2. User & Profile (`/users` & `/profile`)
- `GET /users/me` - Fetch authenticated user details
- `PUT /users/update` - Update name, phone, Aadhaar, PAN
- `GET /users/profile` - Fetch current gig profile
- `POST /profile/connect-platform` - Connect gig platform (Zomato, Swiggy, Uber)
- `GET /profile/platform-data` - Retrieve verified earnings & rating stats

### 3. AI Credit Underwriting (`/credit-score`)
- `POST /credit-score` - Execute XGBoost ML Underwriting engine using cash flow:
  - Input: `daily_earnings`, `working_hours`, `ratings`, `fuel_expenses`, `monthly_expenses`, `savings`
  - Output: `credit_score` (300-850), `risk_level`, `eligible_loan`, `recommended_daily_repayment`, `confidence_score`

### 4. Micro-Loans (`/loan`)
- `POST /loan/apply` - Submit loan request
- `GET /loan/history` - View all historical loans
- `GET /loan/active` - Fetch current active micro-loan
- `POST /loan/approve` - Admin/Bank instant loan sanction
- `POST /loan/reject` - Reject loan application

### 5. Repayment Engine (`/repayment`)
- `POST /repayment/process` - Execute daily UPI AutoPay repayment. If `income == 0`, activates **Smart Pause** (`debit = 0`).
- `POST /repayment/pause` - Manually request repayment pause
- `POST /repayment/resume` - Resume automated daily repayment
- `GET /repayment/history` - Fetch repayment calendar & transaction ref list

### 6. Invoice Duplicate Fraud Engine (`/invoice` & `/fraud`)
- `POST /invoice/upload` - Fingerprint invoice using `SHA-256(GSTIN|Platform|Invoice#|Amount)`:
  - Checks central multi-bank ledger. If duplicate exists -> Returns `HTTP 400 Duplicate Financing Detected`.
- `GET /fraud/ledger` - Inspect central SHA-256 fraud registry

### 7. Nominee & Wealth Succession (`/nominee` & `/succession`)
- `POST /nominee/register` - Register family nominee details
- `GET /nominee/details` - Fetch registered nominee details
- `GET /succession/rescue/{aadhaar}` - Account Aggregator & Death Registry rescue:
  - Discovers Bank Accounts, Life Insurance, EPFO, Mutual Funds, Wallets.
  - Auto generates claim IDs & downloadable forms.

### 8. PDF Reports (`/reports`)
- `GET /reports/credit` - Download PDF Credit Rating Certificate
- `GET /reports/fraud` - Download PDF Invoice SHA-256 Inspection Audit
- `GET /reports/loan` - Download PDF Micro-Loan Statement
- `GET /reports/succession` - Download PDF Nominee Claim Certificate

### 9. Analytics & Admin (`/analytics` & `/admin`)
- `GET /analytics/dashboard` - Real-time systemic KPI metrics & charts data
- `GET /admin/users` - View all registered platform users
- `GET /admin/loans` - View all loan applications
- `GET /admin/frauds` - View all blocked fraud records
- `GET /admin/claims` - View all succession claims
