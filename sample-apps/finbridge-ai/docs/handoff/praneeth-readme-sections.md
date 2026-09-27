## How investment growth projections are computed

`project_investment_growth` never returns a single number. For the requested
`fundCategory` (`equity | debt | hybrid | index`), we track one real,
representative mutual fund on [mfapi.in](https://www.mfapi.in), verified live:

- equity → Nippon India Large Cap Fund (schemeCode 118632)
- index → UTI Nifty 50 Index Fund (schemeCode 120716)
- hybrid → HDFC Balanced Advantage Fund (schemeCode 118968)
- debt → ICICI Prudential Liquid Fund (schemeCode 120197)

We pull that fund's full NAV history and compute its trailing 3-year and
5-year CAGR (using the actual elapsed time between NAV points, not a nominal
assumption — a fund with less history than requested simply doesn't produce
that horizon's rate). The lower of the two becomes the `lowEstimate` rate, the
higher becomes the `highEstimate` rate — the spread between two real
historical windows *is* the range, rather than us inventing a volatility
margin on top of a single guessed number. Both rates are run through the
standard monthly SIP future-value formula for the requested `monthlyAmount`
and `years`.

If mfapi.in is unreachable, we serve the last successfully-fetched band from
an in-memory cache (`navSource` says "Cached NAV..."). If there's no cache
either (cold start with a dead API), we fall back to a static, published
long-term category-average band (`navSource` says "Static historical
assumption..."). The tool never throws just because the network is down.

| category | static fallback band |
|---|---|
| equity | 10%–14% |
| index | 10%–13% |
| hybrid | 8%–11% |
| debt | 5%–7% |

*(Long-term published category averages for Indian mutual funds — cite the
specific source, e.g. AMFI or Value Research category averages, before this
goes in front of judges.)*

## How the financial health score is computed

`calculate_financial_health` has no external dependency — pure scoring over
the caller's inputs:

- **savingsRate** sub-score: `(income - expenses - debtPayment) / income`,
  scaled so 0% saved = 0 and 30%+ saved = 100, floored at 0.
- **emergencyFund** sub-score: `emergencyFundMonths / 6`, capped at 100 (6
  months of expenses is the standard target).
- **debtRatio** sub-score: monthly debt payments as a share of income, scaled
  so 0% = 100 and 40%+ (a conventional high-risk debt-to-income threshold) =
  0.
- **score**: weighted average — savings rate 40%, emergency fund 30%, debt
  ratio 30%.

`suggestions[]` always contains at least one entry, prioritized: income
exceeded by expenses+debt, then low savings rate, then thin emergency fund,
then high debt ratio, plus an extra note if the stated `savings` balance
doesn't roughly match the stated `emergencyFundMonths`. An all-strong result
gets a positive-reinforcement suggestion instead of a warning.

Both tools always include `risk_note` and `educational_only: true` — neither
tool recommends a product or gives financial advice; they compute and
explain.
