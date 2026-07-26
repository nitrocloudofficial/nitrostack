-- Seed initial demo users & data into PostgreSQL
INSERT INTO users (full_name, email, phone, password_hash, role, aadhaar_number, pan_number) 
VALUES 
('Rajesh Verma', 'rajesh.verma@zomato.com', '9876543210', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'Worker', '999988887777', 'ABCDE1234F'),
('Risk Manager Admin', 'admin@gigsecure.ai', '9811122233', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'Admin', '111122223333', 'ADMDE9999A'),
('HDFC Bank Lender', 'bank@hdfc.com', '9844455566', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'Bank', '444455556666', 'BNKDE8888B');

INSERT INTO gig_profiles (user_id, primary_platform, secondary_platforms, avg_monthly_income, working_hours, upi_id)
VALUES (1, 'Zomato', 'Swiggy, Uber', 32000.0, 48.0, 'rajesh@okhdfcbank');

INSERT INTO loans (user_id, principal_amount, total_repayable, interest_rate, tenure_months, daily_repayment_amount, remaining_balance, status)
VALUES (1, 25000.0, 27500.0, 12.5, 6, 152.78, 18400.0, 'Active');
