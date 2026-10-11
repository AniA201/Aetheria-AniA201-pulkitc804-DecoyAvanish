import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

base_dir = Path(__file__).parent
load_dotenv(base_dir / ".env", override=True)
configured_database_url = os.environ.get("DATABASE_URL", f"sqlite:///{base_dir / 'aetheria.db'}")
# Resolve the documented sqlite:///./... form from this backend's directory, not
# from whichever shell happened to launch the FastAPI process.
if configured_database_url.startswith("sqlite:///./"):
    DATABASE_URL = f"sqlite:///{base_dir / configured_database_url.removeprefix('sqlite:///./')}"
else:
    DATABASE_URL = configured_database_url
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-local-secret")
RESEARCHER_REGISTRATION_KEY = os.environ.get("RESEARCHER_REGISTRATION_KEY")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

app = FastAPI(title="Aetheria API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
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


class HandoffRequest(BaseModel):
    prompt_id: str = Field(max_length=80)
    topic: str = Field(max_length=200)
    label: Literal["Understands the key concept", "Partially understands", "Needs clarification", "Requires human follow-up"]
    response: str = Field(max_length=2000)
    feedback: str = Field(max_length=2000)
    speaker: Literal["participant", "caregiver"] = "participant"
    misconception: Optional[str] = Field(default=None, max_length=300)
    language: Literal["en", "es", "fr", "zh"] = "en"
    document_id: str = Field(max_length=80)
    version: str = Field(max_length=40)
    engine: Optional[Literal["gemini", "ollama", "local"]] = None


class MessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


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
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS handoffs (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users (id),
              prompt_id TEXT NOT NULL,
              topic TEXT NOT NULL,
              label TEXT NOT NULL,
              response TEXT NOT NULL,
              feedback TEXT NOT NULL,
              speaker TEXT NOT NULL DEFAULT 'participant',
              misconception TEXT,
              language TEXT NOT NULL DEFAULT 'en',
              document_id TEXT NOT NULL,
              version TEXT NOT NULL,
              engine TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS handoffs_created_idx ON handoffs (created_at)"))
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS handoff_messages (
              id TEXT PRIMARY KEY,
              handoff_id TEXT NOT NULL REFERENCES handoffs (id),
              author_id TEXT NOT NULL REFERENCES users (id),
              message TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        connection.execute(text("CREATE INDEX IF NOT EXISTS handoff_messages_handoff_idx ON handoff_messages (handoff_id, created_at)"))


@app.on_event("startup")
def startup():
    initialise_database()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "database": engine.url.get_backend_name()}


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


def current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in first.")
    try:
        claims = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your sign-in has expired. Please sign in again.")
    return {"id": claims.get("sub"), "role": claims.get("role")}


@app.post("/api/handoffs", status_code=status.HTTP_201_CREATED)
def create_handoff(payload: HandoffRequest, user=Depends(current_user)):
    if user["role"] != "client":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only participant accounts send teach-back handoffs.")
    row = {"id": str(uuid4()), "user_id": user["id"], **payload.model_dump()}
    with engine.begin() as connection:
        connection.execute(text("""
            INSERT INTO handoffs (id, user_id, prompt_id, topic, label, response, feedback, speaker, misconception, language, document_id, version, engine)
            VALUES (:id, :user_id, :prompt_id, :topic, :label, :response, :feedback, :speaker, :misconception, :language, :document_id, :version, :engine)
        """), row)
    return {"id": row["id"]}


@app.get("/api/handoffs")
def list_handoffs(user=Depends(current_user)):
    if user["role"] != "researcher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only research-team accounts can read handoffs.")
    with engine.begin() as connection:
        rows = connection.execute(text("""
            SELECT h.id, h.prompt_id, h.topic, h.label, h.response, h.feedback, h.speaker, h.misconception,
                   h.language, h.document_id, h.version, h.engine, h.created_at, u.full_name AS participant
            FROM handoffs h JOIN users u ON u.id = h.user_id
            ORDER BY h.created_at DESC LIMIT 100
        """)).mappings().all()
        messages = connection.execute(text("""
            SELECT m.id, m.handoff_id, m.message, m.created_at, u.full_name AS author, u.role AS author_role
            FROM handoff_messages m JOIN users u ON u.id = m.author_id
            ORDER BY m.created_at ASC
        """)).mappings().all()
    grouped = {}
    for message in messages:
        grouped.setdefault(message["handoff_id"], []).append(dict(message))
    return {"handoffs": [{**dict(row), "messages": grouped.get(row["id"], [])} for row in rows]}


@app.get("/api/messages")
def list_participant_messages(user=Depends(current_user)):
    if user["role"] != "client":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only participant accounts can read their messages.")
    with engine.begin() as connection:
        rows = connection.execute(text("""
            SELECT m.id, m.handoff_id, m.message, m.created_at, u.full_name AS author, u.role AS author_role,
                   h.topic, h.document_id, h.version
            FROM handoff_messages m
            JOIN handoffs h ON h.id = m.handoff_id
            JOIN users u ON u.id = m.author_id
            WHERE h.user_id = :user_id
            ORDER BY m.created_at ASC
        """), {"user_id": user["id"]}).mappings().all()
    return {"messages": [dict(row) for row in rows]}


@app.post("/api/handoffs/{handoff_id}/messages", status_code=status.HTTP_201_CREATED)
def create_handoff_message(handoff_id: str, payload: MessageRequest, user=Depends(current_user)):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Write a message before sending it.")
    with engine.begin() as connection:
        handoff = connection.execute(text("SELECT user_id FROM handoffs WHERE id = :id"), {"id": handoff_id}).mappings().first()
        if not handoff:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="That follow-up no longer exists.")
        if user["role"] == "client" and handoff["user_id"] != user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only reply to your own follow-ups.")
        row = {"id": str(uuid4()), "handoff_id": handoff_id, "author_id": user["id"], "message": message}
        connection.execute(text("""
            INSERT INTO handoff_messages (id, handoff_id, author_id, message)
            VALUES (:id, :handoff_id, :author_id, :message)
        """), row)
    return {"id": row["id"]}


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
