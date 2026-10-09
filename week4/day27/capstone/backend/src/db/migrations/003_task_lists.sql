-- 003_task_lists: Google-Tasks-style lists. Tasks gain list_id + float-rank position.
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lists_user ON task_lists(user_id, position);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id UUID NULL REFERENCES task_lists(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position DOUBLE PRECISION NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tasks_list_pos ON tasks(list_id, position);

-- Backfill: one "My Tasks" list per user that has tasks but no lists yet,
-- existing tasks assigned ordered by created_at.
DO $$
DECLARE u RECORD;
DECLARE lid UUID;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM tasks WHERE list_id IS NULL LOOP
    SELECT id INTO lid FROM task_lists WHERE user_id = u.user_id ORDER BY position LIMIT 1;
    IF lid IS NULL THEN
      INSERT INTO task_lists(user_id, title, position) VALUES (u.user_id, 'My Tasks', 0) RETURNING id INTO lid;
    END IF;
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM tasks WHERE user_id = u.user_id AND list_id IS NULL
    )
    UPDATE tasks t SET list_id = lid, position = o.rn * 1024 FROM ordered o WHERE o.id = t.id;
  END LOOP;
END $$;
