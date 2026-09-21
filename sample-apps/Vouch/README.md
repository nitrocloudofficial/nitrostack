# Vouch — Trust-First Review Platform

**Vouch** is a Model Context Protocol (MCP) server that provides a verifiable, fraud-resistant review and reputation platform. Every review gets a **trust score** (0-100) computed from multiple signals: evidence quality, reviewer reputation, originality, account age, and community validation.

Built with [NitroStack](https://nitrostack.ai) — the official MCP framework for TypeScript.

---

## What Makes Vouch Different?

| Traditional Review Sites | Vouch |
|--------------------------|-------|
| Star rating + text | **Trust score (0-100)** with explainability |
| Anyone can spam reviews | **Multi-signal verification**: evidence, reputation, AI analysis |
| No reviewer accountability | **Badge tier system** (New → Verified → Trusted → Expert → Guardian → Truth Keeper) |
| No fraud detection | **Real-time fraud risk scoring** per business |
| Opaque spam filtering | **Transparent AI analysis**: sentiment, duplicates, spam patterns |

---

## Core Features

### 🔐 Auth & User Management
- Email/password signup with JWT tokens
- Roles: `consumer`, `business`, `moderator`, `admin`
- Email verification (awards +10 reputation points)

### ⭐ Reviews
- Submit reviews with 1-5 star ratings + text
- Attach evidence (receipts, photos, bookings) to boost trust score by +30
- Update or soft-delete reviews
- List/filter by business, user, or trust score

### 🎯 Trust Engine
- **Trust Score (0-100)**: baseline 50, computed from:
  - **Evidence Score** (max +30): verified receipts, photos, bookings
  - **Reputation Score** (max +20): reviewer badge tier
  - **Originality Score** (max +20): duplicate detection via AI
  - **Account Age Score** (max +15): 180+ days = max points
  - **Community Score** (max +15): helpful/agree reactions
- **Penalties**: rapid submission (-15), sentiment/rating mismatch (-10), reports (-10)
- **Fraud Detection**: review spikes, rating anomalies, low-trust clusters

### 🏆 Reputation & Badges
- Earn points for submitting reviews, attaching evidence, receiving reactions
- **Badge Tiers**:
  - `new_reviewer` (0 pts)
  - `verified_reviewer` (50 pts)
  - `trusted_reviewer` (150 pts)
  - `expert_reviewer` (300 pts)
  - `community_guardian` (500 pts)
  - `truth_keeper` (1000 pts)
- Leaderboard: top reviewers by reputation

### 🤝 Community
- **Reactions**: helpful, agree, disagree, report
- **Moderation Queue**: file reports (fake, misleading, spam, offensive)
- Moderators resolve reports (upheld → flag review, dismissed → keep)

### 🏢 Business
- Register and claim businesses
- Dashboard: trust score, fraud risk, review distribution, AI summary
- Search businesses by name
- Auto-update metrics (avg trust score, fraud risk, review count)

### 🤖 AI Analysis
- **Sentiment**: positive/neutral/negative (keyword + rating heuristic)
- **Duplicate Detection**: Jaccard similarity on word-level text
- **Spam Scoring**: rapid submission, rating bias, generic text, repeat reviews
- **Smart Summary**: "people love" vs "people dislike" themes

---

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Vouch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Run database schema (PostgreSQL 14+)
psql -d <your-database> -f db/schema.sql

# Development mode
npm run dev

# Production build
npm run build
npm start
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://localhost/vouch
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

---

## Project Structure

```
Vouch/
├── src/
│   ├── lib/                    # Core services
│   │   ├── auth.service.ts
│   │   ├── database.service.ts
│   │   ├── trust-engine.service.ts
│   │   └── ai-analysis.service.ts
│   ├── modules/                # Feature modules
│   │   ├── auth/               # Signup, login, email verification
│   │   ├── reviews/            # Review CRUD, evidence attachment
│   │   ├── trustengine/        # Trust scoring, fraud detection
│   │   ├── reputation/         # Badge tiers, points, leaderboard
│   │   ├── community/          # Reactions, reports, moderation
│   │   ├── business/           # Business profiles, dashboards
│   │   └── ai/                 # AI analysis (sentiment, duplicates, spam)
│   ├── app.module.ts           # Root module
│   └── index.ts                # Entry point
├── db/
│   └── schema.sql              # PostgreSQL schema
├── package.json
└── README.md
```

---

## MCP Tools

### Auth
- `auth_signup` — Register a new account
- `auth_login` — Login with email/password
- `auth_verify_email` — Verify email with token
- `auth_verify_token` — Validate JWT token
- `auth_get_user` — Get user profile by ID

### Reviews
- `reviews_submit` — Submit a review with optional evidence
- `reviews_get` — Get review by ID (with evidence, trust score)
- `reviews_list_by_business` — List reviews for a business (paginated, sortable)
- `reviews_list_by_user` — List reviews by a user
- `reviews_update` — Update review text or rating
- `reviews_delete` — Soft-delete a review

### Trust Engine
- `trust_compute_score` — Compute and save trust score for a review
- `trust_get_score` — Get current trust score with breakdown
- `trust_get_score_history` — Get historical trust scores
- `trust_recalculate` — Recalculate trust score (called when signals change)
- `trust_business_fraud_risk` — Compute fraud risk for a business

### Reputation
- `reputation_get_profile` — Get reviewer reputation profile
- `reputation_add_points` — Award reputation points
- `reputation_award_badge` — Award a badge
- `reputation_leaderboard` — Get top reviewers
- `reputation_update_metrics` — Update metrics (helpful, agree, disagree, report counts)

### Community
- `community_add_reaction` — Add a reaction (helpful, agree, disagree, report)
- `community_remove_reaction` — Remove a reaction
- `community_get_reactions` — Get all reactions for a review
- `community_file_report` — File a moderation report
- `community_get_reports_queue` — Get pending reports for moderation
- `community_resolve_report` — Resolve a report (moderator action)

### Business
- `business_register` — Register a new business
- `business_get` — Get business profile
- `business_dashboard` — Get comprehensive dashboard data
- `business_update_metrics` — Update business metrics (trust, fraud risk, review count)
- `business_search` — Search businesses by name

### AI
- `ai_analyze_review` — Run full AI analysis on a review
- `ai_get_analysis` — Get AI analysis results for a review
- `ai_business_summary` — Generate smart summary for a business
- `ai_detect_duplicates` — Detect duplicate/similar reviews
- `ai_sentiment_distribution` — Get sentiment breakdown
- `ai_spam_risk_reviews` — Get high-spam-score reviews

---

## MCP Resources

Resources provide static reference data to AI agents:

- `auth://roles` — User roles and permissions
- `auth://badge-tiers` — Badge tier thresholds
- `reviews://verification-statuses` — Review verification statuses
- `reviews://evidence-types` — Supported evidence types
- `reviews://sort-options` — Sort options for reviews
- `trustengine://scoring-model` — Trust score signal breakdown
- `trustengine://fraud-signals` — Fraud detection signals
- `reputation://points-guide` — How to earn/lose reputation points
- `reputation://badges` — Available badges and criteria
- `community://reaction-types` — Reaction types and impacts
- `community://report-reasons` — Valid report reasons
- `business://trust-levels` — Trust score ranges and labels
- `business://fraud-risk-levels` — Fraud risk interpretation
- `ai://analysis-signals` — AI signal explanations
- `ai://spam-thresholds` — Spam score thresholds

---

## MCP Prompts

Prompts guide AI agents through workflows:

- `auth-signup-guide` — Guide through account creation
- `auth-login-guide` — Guide through login
- `reviews-submit-guide` — Guide through review submission with evidence
- `reviews-explore-business` — Explore reviews for a business
- `trust-score-explainer` — Explain a review's trust score
- `fraud-investigation` — Investigate fraud for a business
- `reputation-profile` — Understand reputation profile and progression
- `leaderboard-explore` — Show top reviewers
- `community-react` — React to a review
- `moderation-queue` — Work through moderation queue
- `business-setup` — Set up a business profile
- `business-dashboard-summary` — Summarize business dashboard
- `ai-full-review-analysis` — Run full AI analysis pipeline
- `ai-business-health-report` — Generate AI health report for business

---

## Development

### Run in Dev Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Test with NitroStudio
Download [NitroStudio](https://nitrostack.ai/studio) to test your MCP server with a visual client.

---

## Database Schema

The full PostgreSQL schema is in `db/schema.sql` and includes:

- `users` — User accounts (email, password, role, email verification)
- `businesses` — Business profiles (trust score, fraud risk, review count)
- `reviews` — Reviews (rating, text, trust score, verification status)
- `trust_scores` — Trust score timeline (score, reasons, breakdown)
- `evidence` — Evidence attachments (receipts, photos, bookings)
- `reviewer_reputation` — Reviewer profiles (points, badge tier, metrics)
- `badges` — Badges earned by reviewers
- `community_reports` — Moderation reports (reason, status, resolution)
- `ai_analysis` — AI analysis results (sentiment, similarity, spam)
- `audit_logs` — Audit trail (actions, resources, actors)
- `sessions` — Session management (tokens, expiry)
- `community_reactions` — Reactions on reviews (helpful, agree, disagree, report)
- `notifications` — In-app notifications

---

## Roadmap

- [ ] OAuth login (Google, GitHub)
- [ ] Phone verification
- [ ] OCR for receipt evidence
- [ ] LLM-powered sentiment analysis
- [ ] LLM-generated business summaries
- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Email notifications (transactional + digest)
- [ ] Advanced fraud detection (ML models)

---

## License

MIT

---

## Community

- Docs: [NitroStack Docs](https://docs.nitrostack.ai)
- Discord: [NitroStack Discord](https://discord.gg/uVWey6UhuD)
- GitHub: [NitroStack GitHub](https://github.com/nitrostackai)

---

**Built with ❤️ using [NitroStack](https://nitrostack.ai) — the official MCP framework**
