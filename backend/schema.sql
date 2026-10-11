-- Schema for SQLite (local) and Postgres (deployed). The API creates it automatically.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'researcher')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

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
);

CREATE INDEX IF NOT EXISTS handoffs_created_idx ON handoffs (created_at);

CREATE TABLE IF NOT EXISTS handoff_messages (
  id TEXT PRIMARY KEY,
  handoff_id TEXT NOT NULL REFERENCES handoffs (id),
  author_id TEXT NOT NULL REFERENCES users (id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS handoff_messages_handoff_idx ON handoff_messages (handoff_id, created_at);
