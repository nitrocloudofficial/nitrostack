# 🚀 Innovation Gatekeeper

> **An AI-powered MCP Server built with NitroStack that automates the technical evaluation and triage of hackathon and open innovation submissions.**

Innovation Gatekeeper acts as an **AI Technical Reviewer**, reducing the manual effort required to evaluate hundreds of software project submissions. Instead of judges spending hours checking broken repositories, copied projects, incomplete documentation, and failed builds, the AI agent performs an initial technical review and presents a comprehensive scorecard with recommendations.

---

## 📌 Problem Statement

Hackathons, innovation programs, and enterprise idea portals receive hundreds of software submissions.

Manual evaluation is slow and inconsistent because reviewers must:

- Clone and inspect repositories
- Verify if projects build successfully
- Check documentation quality
- Detect copied or template repositories
- Assess technical completeness
- Prioritize projects for judging

Innovation Gatekeeper automates this process using AI and MCP tools.

---

# 🎯 Solution

Innovation Gatekeeper is an **MCP (Model Context Protocol) Server** built using **NitroStack**.

Instead of exposing many independent tools, it provides a single intelligent entry point:

```
triage_submission()
```

The AI agent automatically decides which internal tools to invoke based on the submitted project.

---

# 🏗 Architecture

```
                User
                  │
                  ▼
         Gemini / Claude / GPT
                  │
          Model Context Protocol
                  │
        Innovation Gatekeeper
                  │
      ┌───────────┼────────────┐
      ▼           ▼            ▼
 GitHub       Build Test   Originality
 Auditor      Verification   Checker
      ▼           ▼            ▼
     Submission Evaluation
                  │
                  ▼
          Triage Router
                  │
                  ▼
          Judge Scorecard
```

---

# ⚙ Core MCP Tools

## 1️⃣ Repository Auditor

**Tool**

```
inspect_repository()
```

### Responsibilities

- Clone repository
- Analyze commit history
- Evaluate repository structure
- Detect inactive repositories
- Collect contributor metrics
- Perform static analysis

### Output

- Repository health
- Commit statistics
- Contributor insights
- Code quality metrics

---

## 2️⃣ Build Verifier

**Tool**

```
run_build_verification()
```

### Responsibilities

- Install dependencies
- Execute build
- Run tests
- Capture logs

### Output

- Build status
- Test results
- Build logs
- Dependency errors

---

## 3️⃣ Originality Checker

**Tool**

```
check_license_and_originality()
```

### Responsibilities

- Detect repository license
- Identify template projects
- Check copied repositories
- Validate originality
- Flag potential plagiarism

### Output

- Originality Score
- License information
- Similar repositories
- Risk level

---

## 4️⃣ Submission Evaluator

**Tool**

```
evaluate_submission_quality()
```

### Responsibilities

Evaluate submission against the judging rubric.

Checks:

- README quality
- Architecture documentation
- Required technologies
- Project completeness
- Demo readiness

### Output

- Rubric score
- Missing requirements
- Executive summary

---

## 5️⃣ Triage Router

**Main Public Tool**

```
triage_submission()
```

### Responsibilities

- Aggregate all evaluation scores
- Compute weighted final score
- Assign review tier
- Generate judge recommendation
- Generate participant feedback

### Output

- Final Score
- Review Tier
- Judge Summary
- Improvement Suggestions

---

# 📊 Review Tiers

## 🔴 AUTO_REJECT

Repositories that fail basic validation.

Examples:

- Invalid GitHub URL
- Empty repository
- Missing README
- Build failure
- No meaningful commits
- Broken project
- Template/copied repository

---

## 🟡 TIER_2_REVIEW

Projects requiring manual review.

Examples:

- Minor build issues
- Poor documentation
- Low originality
- Missing optional components

---

## 🟢 TIER_1_SHORTLIST

High-quality submissions.

Characteristics:

- Successful build
- Complete documentation
- Original implementation
- High code quality
- Strong innovation

---

# 📁 Repository Structure

```
innovation-gatekeeper/

├── docs/
│   ├── architecture.md
│   ├── api-flow.md
│   └── tool-flow.md
│
├── src/
│
│   ├── index.ts
│   ├── app.module.ts
│
│   ├── config/
│
│   ├── modules/
│   │
│   │   ├── github-auditor/
│   │   ├── build-verifier/
│   │   ├── originality-checker/
│   │   ├── submission-evaluator/
│   │   └── triage-router/
│
│   ├── integrations/
│
│   ├── services/
│
│   ├── prompts/
│
│   ├── resources/
│
│   ├── widgets/
│
│   ├── shared/
│
│   ├── utils/
│
│   ├── types/
│
│   └── data/
│
├── tests/
│
├── README.md
│
├── package.json
│
└── tsconfig.json
```

---

# 🔄 Workflow

```
User submits GitHub repository
            │
            ▼
     triage_submission()
            │
            ▼
    inspect_repository()
            │
            ▼
 run_build_verification()
            │
            ▼
check_license_and_originality()
            │
            ▼
evaluate_submission_quality()
            │
            ▼
      rank_submission()
            │
            ▼
      Final Scorecard
            │
            ▼
      Human Judge
```

---

# 📦 Resources

The MCP server exposes reusable resources such as:

- innovation://rubric
- innovation://review-tiers
- innovation://submission-status
- innovation://health
- innovation://tool-info

---

# 💬 Prompts

The server includes predefined prompts to simplify interactions:

- Review Repository
- Explain Rejection
- Generate Judge Summary
- Summarize Submission
- Suggest Improvements

---

# 🖥 Widgets

NitroStack widgets provide visual dashboards for AI responses.

Widgets include:

- Repository Scorecard
- Build Verification Dashboard
- Originality Report
- Final Judge Dashboard

---

# 🛠 Technology Stack

- TypeScript
- NitroStack SDK
- Model Context Protocol (MCP)
- Node.js
- Zod
- GitHub APIs
- Docker (Build Verification)
- Static Code Analysis
- AI (Gemini / Claude / OpenAI)

---

# 🚀 Future Enhancements

- Multi-language repository support
- Advanced code quality analysis
- Security vulnerability scanning
- Patent and prior-art semantic search
- Automated demo verification
- CI/CD integration
- Enterprise review dashboards
- Analytics and submission insights

---

# 👥 Team

Developed as part of the **NitroStack MCP Hackathon** to demonstrate how AI agents can automate technical review workflows using the Model Context Protocol.

---

# 📄 License

This project is licensed under the MIT License.