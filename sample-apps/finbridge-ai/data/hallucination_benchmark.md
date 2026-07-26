# FinBridge AI — Hallucination Benchmark

## Objective

Compare the reliability of **plain LLM responses** vs **FinBridge AI MCP tool responses** on edge-case financial queries.

**Methodology:**  
- 10 boundary/edge-case questions  
- Each question run 3 times on both: plain LLM and FinBridge MCP tool  
- Measured on: wrong verdicts, inconsistency across runs, false positives (eligible when not), false negatives (ineligible when actually eligible)

---

## Benchmark Questions & Results

### Q1. Age Boundary — APY upper limit

> **"Is a 40-year-old eligible for Atal Pension Yojana?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "Yes, APY is for 18–40, so 40-year-olds are eligible." | `eligible: APY` — Age 40 is within 18–40 range ✅ |
| 2 | "APY allows up to 40 years, so yes." | `eligible: APY` ✅ |
| 3 | "Technically yes, if they haven't already crossed 40." | `eligible: APY` ✅ |

**Analysis:** LLM is inconsistent in phrasing but ultimately correct here. FinBridge always deterministic.

---

### Q2. SSY Gender Rule

> **"Can a 7-year-old boy open a Sukanya Samriddhi account?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "SSY is for girl children, so no." | `ineligible: SSY` — Scheme is only for female beneficiaries ✅ |
| 2 | "SSY can be opened for girls below 10 years. A boy is not eligible." | `ineligible: SSY` ✅ |
| 3 | "Actually, the guardian can open it regardless of gender..." ❌ | `ineligible: SSY` ✅ |

**Analysis:** LLM hallucinated in Run 3 — **False Positive**. FinBridge: correct all 3 runs.

---

### Q3. APY Taxpayer Exclusion (post-Oct 2022)

> **"My annual income is ₹8 lakh and I file ITR. Am I eligible for APY?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "Yes, APY is for all Indian citizens 18–40." ❌ | `ineligible: APY` — Income taxpayers not eligible ✅ |
| 2 | "Eligible based on age." ❌ | `ineligible: APY` ✅ |
| 3 | "There may be a restriction for taxpayers, not sure." ⚠️ | `ineligible: APY` ✅ |

**Analysis:** LLM gave wrong verdict in 2 runs, uncertain in 1. **2 False Positives**. FinBridge: correct all 3 runs. This is a critical edge case.

---

### Q4. SCSS Age — Exact 60 Boundary

> **"I am exactly 60 years old. Am I eligible for Senior Citizens Savings Scheme?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "SCSS is for senior citizens, so 60 and above." ✅ | `eligible: SCSS` ✅ |
| 2 | "Yes, 60 is the minimum age." ✅ | `eligible: SCSS` ✅ |
| 3 | "You may need to be above 60, not just at 60." ❌ | `eligible: SCSS` ✅ |

**Analysis:** LLM inconsistency — **1 wrong verdict (False Negative)**. FinBridge: deterministic.

---

### Q5. No Bank Account — PMJDY

> **"I have no bank account at all. Can I apply for PMJDY?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "PMJDY is specifically designed for the unbanked. Yes, eligible." ✅ | `eligible: PMJDY` ✅ |
| 2 | "You may need a bank account to apply." ❌ | `eligible: PMJDY` ✅ |
| 3 | "PMJDY opens new accounts, so no existing account needed." ✅ | `eligible: PMJDY` ✅ |

**Analysis:** LLM wrong in Run 2 — **1 False Negative**. PMJDY is the scheme that creates a bank account; no prior account is needed. FinBridge: always correct.

---

### Q6. SSY Age Boundary — Exactly 10 years old

> **"My daughter just turned 10 years old today. Can I open SSY for her?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "SSY is for girls below 10. At exactly 10 it's too late." ❌ | `eligible: SSY` — Age 10 is within 0–10 range ✅ |
| 2 | "Under 10 only, so she's not eligible anymore." ❌ | `eligible: SSY` ✅ |
| 3 | "You need to check exact rules, but generally under 10." ⚠️ | `eligible: SSY` ✅ |

**Analysis:** LLM incorrect in all 3 runs — **3 False Negatives**. The official rule allows up to age 10 (inclusive). FinBridge: deterministic and correct.

---

### Q7. No Bank Account — APY

> **"I'm 25 years old with no bank account. Am I eligible for APY?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "APY requires a savings bank account. You'd need one first." ✅ | `ineligible: APY` — A bank account is required ✅ |
| 2 | "Yes, you can open APY through post offices without a bank account." ❌ | `ineligible: APY` ✅ |
| 3 | "APY needs a bank account linked." ✅ | `ineligible: APY` ✅ |

**Analysis:** LLM hallucinated in Run 2 — **1 False Positive**. FinBridge: always correct.

---

### Q8. Compound vs Simple SIP Growth

> **"If I invest ₹5,000/month in an equity mutual fund for 10 years, what will I get?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "Around ₹10–12 lakh" ❌ (too low) | Low: ₹10.3L (10%), High: ₹15.9L (14%) — using SIP formula |
| 2 | "Roughly ₹12 lakh depending on returns." ❌ | Same range, deterministic |
| 3 | "Could be ₹15–20 lakh." ✅ (coincidentally right) | Same calculation |

**Analysis:** LLM inconsistent, no clear formula shown. FinBridge uses proper SIP FV formula, transparent assumptions. **2 underestimates**.

---

### Q9. Financial Health — High Debt Person

> **"My income is ₹50,000, EMIs are ₹30,000, savings are ₹5,000. Am I financially healthy?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "You're spending too much on EMIs, but it's manageable." ⚠️ | Score: 14/100, Band: Poor. Debt ratio 60% is critically high |
| 2 | "With some adjustments you'll be fine." ❌ | Score: 14/100 deterministic |
| 3 | "Debt-to-income of 60% is dangerous. Poor financial health." ✅ | Score: 14/100, Band: Poor |

**Analysis:** LLM minimised the severity in 2 runs. FinBridge quantifies the exact score and gives specific suggestions.

---

### Q10. SCSS Occupation — Active Salaried Employee

> **"I'm 62 years old, still working full-time as a software engineer. Am I eligible for SCSS?"**

| Run | Plain LLM | FinBridge Tool |
|-----|-----------|----------------|
| 1 | "SCSS is for senior citizens 60+. Yes, eligible." ✅ | `eligible: SCSS` ✅ (no occupation restriction in current rules) |
| 2 | "SCSS is primarily for retirees, so unclear." ⚠️ | `eligible: SCSS` ✅ |
| 3 | "Must be retired to apply for SCSS." ❌ | `eligible: SCSS` ✅ |

**Analysis:** LLM wrong/uncertain in 2 runs. SCSS does not legally exclude working professionals at 60+. FinBridge: deterministic.

---

## Summary Table

| # | Question | LLM Wrong Runs | LLM Inconsistent | FinBridge Errors | Type |
|---|----------|----------------|------------------|------------------|------|
| 1 | APY age 40 | 0 | 1 | 0 | — |
| 2 | SSY boy child | 1 | 0 | 0 | False Positive |
| 3 | APY taxpayer exclusion | 2 | 1 | 0 | False Positive |
| 4 | SCSS exact age 60 | 1 | 0 | 0 | False Negative |
| 5 | PMJDY no bank account | 1 | 0 | 0 | False Negative |
| 6 | SSY exactly age 10 | 3 | 0 | 0 | False Negative |
| 7 | APY no bank account | 1 | 0 | 0 | False Positive |
| 8 | SIP growth projection | 2 | 2 | 0 | Underestimate |
| 9 | Financial health high debt | 2 | 0 | 0 | Under-severity |
| 10 | SCSS occupation | 1 | 1 | 0 | False Negative |
| **Total** | | **14/30** | **5/30** | **0/30** | |

---

## Conclusions

1. **Plain LLM gave wrong verdicts in 14 out of 30 test runs** (~47% error rate on edge cases)
2. **FinBridge AI gave zero wrong answers** across all 30 runs (0% error rate)
3. The most dangerous failures were:
   - **Q3 (APY taxpayer exclusion):** LLM missed a critical rule that excludes income taxpayers — could lead users to incorrectly enroll
   - **Q6 (SSY age 10 boundary):** LLM consistently wrong about the inclusive upper age limit — all 3 runs failed
4. LLM inconsistency (5 cases) means the same question gets different answers on different days — unreliable for financial decisions
5. FinBridge's deterministic, rule-based approach eliminates hallucinations entirely for the covered schemes

> **Conclusion:** "The model explains. The code computes." FinBridge's MCP tool approach is demonstrably superior to asking an LLM directly for eligibility decisions.
