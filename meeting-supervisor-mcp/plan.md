# Plan: Meeting Supervisor Prototype

## 1. Background & Motivation
The NitroStack Hackathon project "Meeting Supervisor" aims to solve the inefficiencies of modern remote and hybrid team meetings. Teams often struggle with manual note-taking, fragmented task tracking, and the lack of a centralized "brain" that captures the context and outcomes of every discussion. This prototype will provide an end-to-end solution for recording, analyzing, and acting upon meeting data.

## 2. Scope & Impact
- **Target Users:** Project managers, team leads, and remote developers.
- **Key Impact:** Reduced administrative overhead, improved accountability via task tracking, and enhanced knowledge retention through searchable meeting archives.

## 3. Proposed Solution

### A. Core Components
1.  **Search & Knowledge Engine:**
    - Integration with a search API (e.g., Tavily) to fetch external data during meetings.
    - A "Brain" powered by a vector database to store and retrieve historical meeting context.
2.  **Scheduling & Calendar:**
    - Bi-directional sync with Google Calendar.
    - Automated rescheduling logic for "unaccomplished" or missed meetings.
3.  **Meeting Analysis Engine:**
    - Real-time or post-meeting transcription using OpenAI Whisper or Google Speech-to-Text.
    - **Speaker Diarization:** AI-driven detection of different speakers to attribute conversations accurately.
    - **Keynote Extraction:** Automatic highlighting of action items and critical decisions.
4.  **Task Management Workflow:**
    - **Team Lead Dashboard:** Interface to assign tasks directly from meeting highlights.
    - **Teammate Dashboard:** Interface to accept or deny tasks with reason fields.
    - **Task Analyzer:** AI agent that reviews task descriptions for clarity and estimates effort.
5.  **Multi-Model Hub:**
    - A configuration layer to switch between models (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) based on the task (e.g., Gemini for long-context analysis, GPT-4o for fast transcription refinement).

### B. Agentic Workflow
- **Supervisor Agent:** Monitors the "Brain" and Calendar to suggest meeting times and detect conflicts.
- **Summarizer Agent:** Processes transcripts to generate keynotes and task suggestions.
- **Review Agent:** Analyzes teammate reviews and task completion patterns to provide productivity insights.

## 4. Proposed Technical Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, Lucide Icons.
- **Backend:** Python (FastAPI) for AI/ML processing; Node.js (Next.js API routes) for core business logic.
- **Database:** 
    - **Relational:** Supabase (PostgreSQL) for user data and task states.
    - **Vector:** Pinecone or ChromaDB for meeting embeddings.
- **AI/ML:**
    - LangChain or LlamaIndex for agent orchestration.
    - Whisper for audio-to-text.
- **Infrastructure:** Docker for containerization, Google Cloud/AWS for hosting.

## 5. Implementation Plan

### Phase 1: Foundation (Days 1-2)
- [x] Set up project repository and folder structure.
- [ ] Initialize Supabase database with schemas for Users, Meetings, and Tasks.
- [ ] Implement Google Calendar OAuth2 integration.
- [ ] Create basic UI for Meeting Dashboard.

### Phase 2: Meeting Engine (Days 3-5)
- [ ] Implement audio recording capture via browser.
- [ ] Integrate Whisper for transcription and Pyannote for speaker diarization.
- [ ] Develop the "Brain" logic: Embedding transcripts into the vector database.
- [ ] Implement "Keynote" extraction using an LLM.

### Phase 3: Task & Agent Workflow (Days 6-8)
- [ ] Build Task Assignment UI (Lead -> Teammate).
- [ ] Implement Accept/Deny logic with real-time notifications.
- [ ] Integrate Task Analyzer Agent to validate task requirements.
- [ ] Build the Multi-Model switching logic in the settings.

### Phase 4: Refinement & Testing (Days 9-10)
- [ ] Implement meeting rescheduling logic for failed meetings.
- [ ] Add Search Engine integration for real-time context fetching.
- [ ] Conduct end-to-end testing of the agent workflow.
- [ ] Final UI/UX polish and documentation.

## 6. Verification
- **Functional Testing:** Verify Google Calendar sync, transcription accuracy, and task state transitions.
- **Agent Testing:** Ensure the Task Analyzer correctly identifies vague tasks.
- **User Acceptance:** Mock a meeting and verify if highlights and tasks are generated as expected.

## 7. Migration & Rollback
- Maintain database backups in Supabase.
- Use feature flags for new AI model integrations to allow quick rollbacks if a model fails.
