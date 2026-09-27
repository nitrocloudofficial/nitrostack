# VeriChain AI Local Installation Guide

Follow these steps to set up and run VeriChain AI locally on your system.

## Prerequisites
- **Python 3.12** or higher.
- **Node.js** (for running client widget builds or NitroStack CLI).
- Active internet connection.

---

## 1. Project Cloning & Directory Set Up
Ensure you are in the project workspace directory:
```bash
cd D:\Hackathon\my-mcp-server
```

## 2. Install Python Dependencies
Install all required libraries using pip:
```bash
python -m pip install -r requirements.txt
```
This installs the FastAPI server, Streamlit visual UI, LangGraph agent stack, Model Context Protocol libraries, and file decoders.

## 3. Environment Variable Configuration
Copy the `.env.example` file and create `.env` in the root:
```bash
copy .env.example .env
```
Open `.env` and enter your security keys and LLM settings:
```ini
# Core Configuration
SECRET_KEY=your_private_encryption_key
DATABASE_URL=sqlite:///./database/verichain.db

# LLM Providers (Optional - falls back to NLP heuristics if empty)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## 4. Run SQLite Migrations
The database schema initializes automatically on first server boot. However, you can initialize it or verify the config:
```bash
python config.py
```

## 5. Starting the Platforms

### A. Run API Backend (FastAPI)
Launch the FastAPI uvicorn daemon:
```bash
python -m uvicorn backend.main:app --reload --port 8000
```
Visit API Swagger documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### B. Run Frontend Dashboard (Streamlit)
Open a new shell and start the Streamlit SaaS UI:
```bash
python -m streamlit run app.py --server.port 8501
```
Open your web browser at: [http://localhost:8501](http://localhost:8501)

### C. Run the MCP Server
To boot the Model Context Protocol stdio service:
```bash
python mcp/server.py
```
To run and inspect tools using a visual client, launch **NitroStudio** (https://nitrostack.ai/studio) and connect it to standard input/output mapping to the command above.
