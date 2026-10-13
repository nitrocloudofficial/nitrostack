"""
Core Package — Application Infrastructure

Modules:
  config.py     — Pydantic Settings model (reads from .env)
  database.py   — SQLAlchemy async session factory (Supabase PostgreSQL)
  security.py   — JWT token validation, password hashing
  cache.py      — Redis connection and cache utilities
  logging.py    — Structured logging configuration

This is the infrastructure layer — nothing in this package contains
business logic. All modules here are utilities consumed by services
and routers.

Phase 1: Stubs with documented future implementation.
"""
