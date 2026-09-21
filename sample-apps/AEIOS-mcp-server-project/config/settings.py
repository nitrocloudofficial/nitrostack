import os

from dotenv import load_dotenv

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "AEIOS-X")
APP_ENV = os.getenv("APP_ENV", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = APP_ENV == "development"

settings = type("Settings", (), {
    "APP_NAME": APP_NAME,
    "APP_ENV": APP_ENV,
    "LOG_LEVEL": LOG_LEVEL,
    "HOST": HOST,
    "PORT": PORT,
    "DEBUG": DEBUG,
})()
