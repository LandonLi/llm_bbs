CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  theme_prompt TEXT NOT NULL DEFAULT '',
  posting_frequency TEXT NOT NULL DEFAULT 'medium',
  reply_density TEXT NOT NULL DEFAULT 'medium',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  internal_name TEXT NOT NULL UNIQUE,
  bio_prompt TEXT NOT NULL DEFAULT '',
  tone_style TEXT NOT NULL DEFAULT '',
  activity_level TEXT NOT NULL DEFAULT 'medium',
  preferred_boards_json TEXT NOT NULL DEFAULT '[]',
  interaction_preferences_json TEXT NOT NULL DEFAULT '{}',
  allow_alias_switching INTEGER NOT NULL DEFAULT 1,
  alias_switch_rate REAL NOT NULL DEFAULT 0.2,
  favorite_emoticons_json TEXT NOT NULL DEFAULT '[]',
  common_phrases_json TEXT NOT NULL DEFAULT '[]',
  banned_phrases_json TEXT NOT NULL DEFAULT '[]',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('avatar', 'emoticon', 'badge', 'icon')),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  tags_json TEXT NOT NULL DEFAULT '[]',
  source_note TEXT NOT NULL DEFAULT '',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  asset_id INTEGER,
  description TEXT NOT NULL DEFAULT '',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS identity_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  avatar_asset_id INTEGER,
  signature_text TEXT NOT NULL DEFAULT '',
  user_group_name TEXT NOT NULL DEFAULT '',
  user_title TEXT NOT NULL DEFAULT '',
  board_title_default TEXT NOT NULL DEFAULT '',
  points_display TEXT NOT NULL DEFAULT '0',
  post_count_display TEXT NOT NULL DEFAULT '0',
  essence_count_display TEXT NOT NULL DEFAULT '0',
  registered_at_display TEXT NOT NULL DEFAULT '',
  location_display TEXT NOT NULL DEFAULT '',
  badge_ids_json TEXT NOT NULL DEFAULT '[]',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (avatar_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS persona_board_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL,
  board_id INTEGER NOT NULL,
  preferred_identity_preset_ids_json TEXT NOT NULL DEFAULT '[]',
  board_title_override TEXT NOT NULL DEFAULT '',
  tone_offset_prompt TEXT NOT NULL DEFAULT '',
  activity_weight REAL NOT NULL DEFAULT 1.0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  UNIQUE (persona_id, board_id)
);

CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  persona_id INTEGER NOT NULL,
  identity_preset_id INTEGER,
  title TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  sanitized_content TEXT NOT NULL DEFAULT '',
  rendered_html TEXT NOT NULL DEFAULT '',
  reply_count INTEGER NOT NULL DEFAULT 0,
  view_count_display TEXT NOT NULL DEFAULT '0',
  is_pinned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden', 'archived')),
  published_at TEXT,
  last_replied_at TEXT,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE RESTRICT,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT,
  FOREIGN KEY (identity_preset_id) REFERENCES identity_presets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  floor_number INTEGER NOT NULL,
  persona_id INTEGER NOT NULL,
  identity_preset_id INTEGER,
  reply_to_post_id INTEGER,
  raw_content TEXT NOT NULL,
  sanitized_content TEXT NOT NULL DEFAULT '',
  rendered_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden', 'archived')),
  published_at TEXT,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE RESTRICT,
  FOREIGN KEY (identity_preset_id) REFERENCES identity_presets(id) ON DELETE SET NULL,
  FOREIGN KEY (reply_to_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  UNIQUE (thread_id, floor_number)
);

CREATE TABLE IF NOT EXISTS emoticon_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code_prefix TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS emoticons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id INTEGER NOT NULL,
  asset_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  label TEXT NOT NULL DEFAULT '',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (pack_id) REFERENCES emoticon_packs(id) ON DELETE RESTRICT,
  FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS content_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'board', 'persona')),
  scope_id INTEGER,
  min_length INTEGER NOT NULL DEFAULT 1,
  max_length INTEGER NOT NULL DEFAULT 5000,
  max_emoticons INTEGER NOT NULL DEFAULT 30,
  allowed_markup_json TEXT NOT NULL DEFAULT '[]',
  banned_topics_json TEXT NOT NULL DEFAULT '[]',
  style_prompt TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS generation_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_type TEXT NOT NULL CHECK (run_type IN ('thread', 'replies', 'continuation')),
  board_id INTEGER,
  thread_id INTEGER,
  persona_ids_json TEXT NOT NULL DEFAULT '[]',
  input_context_json TEXT NOT NULL DEFAULT '{}',
  raw_output_text TEXT NOT NULL DEFAULT '',
  parsed_output_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rejected')),
  error_message TEXT NOT NULL DEFAULT '',
  token_usage_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_name TEXT NOT NULL,
  site_subtitle TEXT NOT NULL DEFAULT '',
  announcement TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  default_page_size INTEGER NOT NULL DEFAULT 20,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_boards_enabled_sort ON boards (is_enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_identity_presets_persona_id ON identity_presets (persona_id);
CREATE INDEX IF NOT EXISTS idx_threads_board_status ON threads (board_id, status, published_at);
CREATE INDEX IF NOT EXISTS idx_posts_thread_status_floor ON posts (thread_id, status, floor_number);
CREATE INDEX IF NOT EXISTS idx_media_assets_type_enabled ON media_assets (type, is_enabled);
CREATE INDEX IF NOT EXISTS idx_emoticons_pack_enabled ON emoticons (pack_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_content_policies_scope ON content_policies (scope_type, scope_id);
