-- Sessions: named, accessible from any interface
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'web'
);

CREATE INDEX idx_sessions_name ON sessions(name);
CREATE INDEX idx_sessions_updated ON sessions(updated_at DESC);

-- Messages: conversation history
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    source TEXT DEFAULT 'web',
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session ON messages(session_id, timestamp);

-- Auth tokens for web sessions
CREATE TABLE auth_tokens (
    id TEXT PRIMARY KEY,
    user_type TEXT NOT NULL DEFAULT 'web',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    last_used_at TEXT
);

CREATE INDEX idx_tokens_expires ON auth_tokens(expires_at);

-- User session tracking (which session each client is on)
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    client_type TEXT NOT NULL,
    client_id TEXT NOT NULL,
    current_session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (current_session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_sessions_client ON user_sessions(client_type, client_id);

-- Media files downloaded from Telegram
CREATE TABLE media_files (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    telegram_file_id TEXT,
    file_type TEXT NOT NULL,
    original_filename TEXT,
    stored_path TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_media_session ON media_files(session_id);
CREATE INDEX idx_media_telegram ON media_files(telegram_file_id);

-- Activity log for monitoring
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    activity_type TEXT NOT NULL,
    summary TEXT,
    details TEXT,
    sent_to_monitoring INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
