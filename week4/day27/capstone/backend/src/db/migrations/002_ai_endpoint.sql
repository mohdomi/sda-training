-- 002_ai_endpoint: break AI usage down per endpoint.
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS endpoint TEXT NOT NULL DEFAULT 'chat';
CREATE INDEX IF NOT EXISTS idx_ai_logs_endpoint ON ai_logs(user_id, endpoint, created_at DESC);
