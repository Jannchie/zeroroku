CREATE TABLE IF NOT EXISTS author_video_schedules (
  mid BIGINT PRIMARY KEY,
  next TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_author_video_schedules_next
  ON author_video_schedules(next);
