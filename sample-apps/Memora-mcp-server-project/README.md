# Memora: The Autonomous Agentic Study Platform 🧠⚡

Built for the **NitroStack Hackathon**. 

Memora is not a passive AI chatbot. It is a fully autonomous agentic platform that reads syllabi, calculates the 80/20 Pareto distribution of your course using Past Year Questions (PYQs), and autonomously spins up diverse, non-repeating study modalities (Quizzes, Flashcards, Socratic Interviews) to force active recall.

## 🌟 The "Killer Features"

1. **The "Grill Me" Socratic Interview Mode (Feynman Evaluator)**
   - Acts as a ruthless examiner using an `LLM-as-a-Judge` MCP. It forces you to explain concepts simply, identifies logical gaps, and grills you with follow-up questions until true mastery is achieved.
2. **Autonomous Knowledge Expansion (WebSearch MCP)**
   - If Memora realizes its local vector database lacks specific context, it autonomously triggers a Web Search to scour university archives and synthesize academic content.
3. **Dynamic Widget Emission (No "Wall of Text")**
   - The Agent outputs structured JSON UI Commands via WebSockets. The Next.js frontend instantly reacts by mounting beautiful, interactive, Claymorphic widgets in real-time.
4. **80/20 Analytics Dashboard**
   - Upload a PYQ, and Memora calculates the exact topic weightage of your course so you know exactly what to study.

## 🏗️ Architecture: "MCP Everywhere"

Built on **NitroStack**, every capability is isolated into a standalone Model Context Protocol (MCP) tool:
- `LlamaParse_MCP` (PDF Extraction)
- `QuizEngine_MCP` (Dynamic question generation)
- `Interview_MCP` (Socratic LLM-as-a-judge)
- `WebSearch_MCP` (Tavily academic fetcher)

## 🚀 How to Run the App (Node.js & Next.js)

1. **Install Dependencies**
   ```bash
   npm install
   cd src/widgets && npm install && cd ../..
   ```
2. **Set up Environment Variables**
   - Copy `.env.example` to `.env` and fill in your `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLAMA_CLOUD_API_KEY`, and `TAVILY_API_KEY`.
3. **Run the NitroStack MCP Server & Widgets**
   ```bash
   npm run dev
   ```
4. **Connect via NitroStudio**
   - Open NitroStudio, connect via `stdio`, and start talking to Memora!

## 🤖 How to Run the Python LangGraph Orchestrator

To prove the core agent loop, we've also included a custom **Python LangGraph Orchestrator**. This script connects to the Node.js MCP server, fetches the tools, binds them to a Groq Llama-3 Agent, and runs a continuous chat loop in your terminal.

```bash
cd python_orchestrator
python -m venv venv
# Activate the virtual environment
source venv/bin/activate  # Mac/Linux
.\venv\Scripts\activate   # Windows
# Install dependencies
pip install -r requirements.txt
# Run the autonomous agent!
python orchestrator.py
```
