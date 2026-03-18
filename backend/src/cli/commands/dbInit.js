function runDbInit(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id INTEGER PRIMARY KEY,
      board_id INTEGER NOT NULL,
      persona_id INTEGER NOT NULL,
      identity_preset_id INTEGER,
      title TEXT NOT NULL,
      raw_content TEXT NOT NULL,
      sanitized_content TEXT NOT NULL,
      rendered_html TEXT NOT NULL,
      reply_count INTEGER NOT NULL DEFAULT 0,
      view_count_display INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      published_at TEXT,
      last_replied_at TEXT,
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      thread_id INTEGER NOT NULL,
      floor_number INTEGER NOT NULL,
      persona_id INTEGER NOT NULL,
      identity_preset_id INTEGER,
      reply_to_post_id INTEGER,
      raw_content TEXT NOT NULL,
      sanitized_content TEXT NOT NULL,
      rendered_html TEXT NOT NULL,
      status TEXT NOT NULL,
      published_at TEXT,
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_threads_board_id ON threads(board_id);
    CREATE INDEX IF NOT EXISTS idx_threads_published_at ON threads(published_at);
    CREATE INDEX IF NOT EXISTS idx_posts_thread_floor ON posts(thread_id, floor_number);
    CREATE INDEX IF NOT EXISTS idx_posts_reply_to ON posts(reply_to_post_id);
  `);
}

module.exports = {
  runDbInit
};
