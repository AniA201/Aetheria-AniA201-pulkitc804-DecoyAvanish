import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

base_dir = Path(__file__).parent
load_dotenv(base_dir / ".env", override=True)
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{base_dir / 'aetheria.db'}")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-local-secret")
RESEARCHER_REGISTRATION_KEY = os.environ.get("RESEARCHER_REGISTRATION_KEY")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

app = FastAPI(title="Aetheria API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    allow_credentials=True,
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["client", "researcher"]


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["client", "researcher"] = "client"
    researcher_key: Optional[str] = None


def initialise_database():
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              full_name TEXT NOT NULL,
              role TEXT NOT NULL CHECK (role IN ('client', 'researcher')),
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              last_login_at TEXT
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)"))


@app.on_event("startup")
def startup():
    initialise_database()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "database": "sqlite"}


def token_for(user):
    return jwt.encode(
        {"sub": str(user["id"]), "role": user["role"], "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        JWT_SECRET,
        algorithm="HS256",
    )


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    with engine.begin() as connection:
        user = connection.execute(text("""
            SELECT id, email, full_name, role, password_hash
            FROM users WHERE email = :email
        """), {"email": payload.email.lower().strip()}).mappings().first()
        valid = user and user["role"] == payload.role and bcrypt.checkpw(payload.password.encode(), user["password_hash"].encode())
        if not valid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Those details do not match an account of that type.")
        connection.execute(text("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": user["id"]})
    return {"access_token": token_for(user), "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "name": user["full_name"], "role": user["role"]}}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    name = payload.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Please enter your name.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Use a password with at least 8 characters.")
    if payload.role == "researcher" and (not RESEARCHER_REGISTRATION_KEY or not payload.researcher_key or not secrets.compare_digest(payload.researcher_key, RESEARCHER_REGISTRATION_KEY)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="That researcher registration key is not valid.")

    user = {"id": str(uuid4()), "email": payload.email.lower().strip(), "full_name": name, "role": payload.role}
    password_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    try:
        with engine.begin() as connection:
            connection.execute(text("""
                INSERT INTO users (id, email, password_hash, full_name, role)
                VALUES (:id, :email, :password_hash, :full_name, :role)
            """), {**user, "password_hash": password_hash})
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for that email address.")
    return {"access_token": token_for(user), "token_type": "bearer", "user": {"id": user["id"], "email": user["email"], "name": user["full_name"], "role": user["role"]}}
