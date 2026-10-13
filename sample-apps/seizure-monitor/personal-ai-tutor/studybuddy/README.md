# 📚 StudyBuddy AI – Personal AI Tutor & Research Companion

> **Your Personal AI Tutor for Every Subject** — Upload notes, ask doubts, generate quizzes, and build a personalized revision plan with AI.

Built for **NITROSTACK Hackathon 2025** 🏆

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?style=for-the-badge&logo=tailwindcss)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-yellow?style=for-the-badge&logo=python)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📚 **Smart Notes** | Upload PDF, PPT, DOCX, or handwritten photos – AI extracts key concepts |
| 🤖 **AI Tutor Chat** | Context-aware answers from your uploaded notes with step-by-step explanations |
| 📝 **Auto Quiz Generator** | MCQ, JEE numerical, assertion-reason, short answer – with timer & scoring |
| 🃏 **Flashcards** | Auto-generated cards with spaced repetition and difficulty rating |
| 📅 **Revision Planner** | AI-generated daily/weekly study plans with calendar + Kanban board |
| 📈 **Analytics Dashboard** | Study hours, quiz accuracy, subject radar, topic-wise performance |
| 🔬 **Research Assistant** | Paper summarization, citation generation (APA/MLA/IEEE/Chicago) |
| 🌐 **Bilingual Support** | English, Hindi, and Hinglish responses |
| 🎤 **Voice Support** | Speech-to-text input, text-to-speech output |
| 📷 **Homework Scanner** | Upload handwritten questions for AI solving |
| 🧪 **Exam Simulation** | JEE, NEET, CBSE mock tests with negative marking |

---

## 🖥️ Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** for animations
- **Lucide React** for icons
- **Recharts** for analytics charts
- **React Dropzone** for file uploads

### Backend
- **Python FastAPI** – REST + WebSocket
- **LangChain** – RAG pipeline
- **Sentence Transformers** – Embeddings
- **FAISS / ChromaDB** – Vector storage
- **PostgreSQL** (Supabase compatible)
- **JWT Authentication**

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or pnpm

### Frontend Setup

```bash
cd studybuddy
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend Setup

```bash
cd studybuddy/backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
uvicorn main:app --reload --port 8000
```

---

## 📁 Project Structure

```
studybuddy/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles & design tokens
│   ├── auth/
│   │   ├── signin/page.tsx       # Sign in
│   │   ├── signup/page.tsx       # Sign up
│   │   └── forgot-password/page.tsx
│   └── dashboard/
│       ├── layout.tsx            # Dashboard layout (sidebar + header)
│       ├── page.tsx              # Main dashboard
│       ├── tutor/page.tsx        # AI Tutor Chat
│       ├── upload/page.tsx       # File Upload
│       ├── quiz/page.tsx         # Quiz Generator
│       ├── flashcards/page.tsx   # Flashcards
│       ├── analytics/page.tsx    # Analytics Dashboard
│       ├── research/page.tsx     # Research Assistant
│       ├── planner/page.tsx      # Revision Planner
│       ├── subjects/page.tsx     # My Subjects
│       └── settings/page.tsx     # Settings
├── lib/
│   └── utils.ts                  # Utility functions
├── backend/
│   ├── main.py                   # FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── api/                  # API routes
│       ├── core/                 # Config, security
│       ├── models/               # SQLAlchemy models
│       ├── services/             # AI & RAG services
│       ├── rag/                  # Embeddings, vectorstore, chunker
│       └── utils/                # File processing
└── public/                       # Static assets
```

---

## 🎬 Demo Scenario

The app comes pre-loaded with **Class 11 Chemistry – Equilibrium** demo data:

1. 📄 Upload `Ch-7 Equilibrium.pdf`
2. 🤖 AI generates summary
3. 💬 Ask: _"Explain dynamic equilibrium"_ or _"Le Chatelier principle in Hinglish"_
4. 📝 Generate a 10-question JEE-style quiz
5. 📊 Analytics identifies **Equilibrium Constant** as a weak topic
6. 📅 AI creates a 3-day revision plan

---

## 🏆 Hackathon Impact Metrics

| Metric | Value |
|--------|-------|
| ⚡ Faster Revision | 60% |
| 📝 Practice Questions | 3× more |
| 🎯 Personalized Learning | For every student |
| 🌐 Bilingual Support | English + Hindi + Hinglish |

---

## 🔒 Security

- File validation (type + size ≤ 25MB)
- Sanitized text extraction
- JWT authentication with secure handling
- Rate-limited AI requests
- Encrypted sensitive data

---

## 📦 Deployment

| Component | Platform |
|-----------|----------|
| Frontend | **Vercel** |
| Backend | **Railway / Render / Fly.io** |
| Database | **Supabase PostgreSQL** |
| Vector DB | **Self-hosted FAISS** |

---

## 📄 License

MIT License – Built for NITROSTACK Hackathon 2025

---

**Made with ❤️ by Team StudyBuddy**
