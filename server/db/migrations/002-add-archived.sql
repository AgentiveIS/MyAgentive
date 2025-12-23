-- Add archived column to sessions table
ALTER TABLE sessions ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

-- Index for filtering by archived status with ordering
CREATE INDEX idx_sessions_archived ON sessions(archived, updated_at DESC);
