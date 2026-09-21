import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "verichain_secure_secret_key_2026_hackathon_demo")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database/verichain.db")

# LLM Config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Paths
UPLOAD_DIR = BASE_DIR / os.getenv("UPLOAD_DIR", "uploads")
REPORT_DIR = BASE_DIR / os.getenv("REPORT_DIR", "reports")
DB_DIR = BASE_DIR / "database"

# Server Settings
PORT = int(os.getenv("PORT", "8000"))
STREAMLIT_PORT = int(os.getenv("STREAMLIT_PORT", "8501"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Create directories if they do not exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)
DB_DIR.mkdir(parents=True, exist_ok=True)
(BASE_DIR / "static").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "tests").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "docs").mkdir(parents=True, exist_ok=True)
(BASE_DIR / "scripts").mkdir(parents=True, exist_ok=True)

# Helper to verify setup
def print_config():
    print("--- VeriChain AI Config ---")
    print(f"Base Directory: {BASE_DIR}")
    print(f"Database URL: {DATABASE_URL}")
    print(f"Upload Folder: {UPLOAD_DIR}")
    print(f"Reports Folder: {REPORT_DIR}")
    print(f"LLM Provider: {OPENAI_API_BASE} (Model: {OPENAI_MODEL})")
    print(f"API Server Port: {PORT}")
    print("---------------------------")

if __name__ == "__main__":
    print_config()
