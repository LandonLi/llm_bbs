const fs = require('node:fs');
const path = require('node:path');

function readSeedJson(seedDir, fileName) {
  const filePath = path.join(seedDir, fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName} must be a JSON array.`);
  }
  return parsed;
}

function toSqliteBool(value) {
  return value ? 1 : 0;
}

function runSeed(db, seedDir) {
  const threads = readSeedJson(seedDir, 'threads.json');
  const posts = readSeedJson(seedDir, 'posts.json');

  const upsertThread = db.prepare(`
    INSERT INTO threads (
      id, board_id, persona_id, identity_preset_id, title,
      raw_content, sanitized_content, rendered_html,
      reply_count, view_count_display, is_pinned, status,
      published_at, last_replied_at, snapshot_json, created_at, updated_at
    ) VALUES (
      @id, @board_id, @persona_id, @identity_preset_id, @title,
      @raw_content, @sanitized_content, @rendered_html,
      @reply_count, @view_count_display, @is_pinned, @status,
      @published_at, @last_replied_at, @snapshot_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      board_id=excluded.board_id,
      persona_id=excluded.persona_id,
      identity_preset_id=excluded.identity_preset_id,
      title=excluded.title,
      raw_content=excluded.raw_content,
      sanitized_content=excluded.sanitized_content,
      rendered_html=excluded.rendered_html,
      reply_count=excluded.reply_count,
      view_count_display=excluded.view_count_display,
      is_pinned=excluded.is_pinned,
      status=excluded.status,
      published_at=excluded.published_at,
      last_replied_at=excluded.last_replied_at,
      snapshot_json=excluded.snapshot_json,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at
  `);

  const upsertPost = db.prepare(`
    INSERT INTO posts (
      id, thread_id, floor_number, persona_id, identity_preset_id,
      reply_to_post_id, raw_content, sanitized_content, rendered_html,
      status, published_at, snapshot_json, created_at, updated_at
    ) VALUES (
      @id, @thread_id, @floor_number, @persona_id, @identity_preset_id,
      @reply_to_post_id, @raw_content, @sanitized_content, @rendered_html,
      @status, @published_at, @snapshot_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      thread_id=excluded.thread_id,
      floor_number=excluded.floor_number,
      persona_id=excluded.persona_id,
      identity_preset_id=excluded.identity_preset_id,
      reply_to_post_id=excluded.reply_to_post_id,
      raw_content=excluded.raw_content,
      sanitized_content=excluded.sanitized_content,
      rendered_html=excluded.rendered_html,
      status=excluded.status,
      published_at=excluded.published_at,
      snapshot_json=excluded.snapshot_json,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at
  `);

  const transaction = db.transaction(() => {
    for (const thread of threads) {
      upsertThread.run({
        ...thread,
        is_pinned: toSqliteBool(thread.is_pinned),
        snapshot_json: JSON.stringify(thread.snapshot_json)
      });
    }

    for (const post of posts) {
      upsertPost.run({
        ...post,
        snapshot_json: JSON.stringify(post.snapshot_json)
      });
    }
  });

  transaction();
  return {
    threads: threads.length,
    posts: posts.length
  };
}

module.exports = {
  runSeed
};
