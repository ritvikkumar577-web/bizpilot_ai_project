"""
Database connection and session management for BizPilot AI.
Supports PostgreSQL (default) and SQLite (automatic fallback for zero-config local testing).
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# PostgreSQL connection string from environment or SQLite fallback
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./bizpilot.db"
)

# For SQLite, connect_args is needed for multithreading
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency injection helper for FastAPI route handlers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
