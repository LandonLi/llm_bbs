const Fastify = require("fastify");
const { config } = require("./config");
const { getDb } = require("../lib/db");

const DEFAULT_SITE_META = {
  name: "旧时论坛",
  subtitle: "一些旧帖子和旧脾气",
  announcement_html: "",
  footer_text: "Powered by llm_bbs",
  default_page_size: 20,
};
const tableColumnsCache = new Map();

function ok(data) {
  return { ok: true, data };
}

function fail(code, message) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function parseJsonField(input, fallback) {
  if (!input || typeof input !== "string") {
    return fallback;
  }
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return fallback;
  }
  return n;
}

function normalizeBadgeList(badges) {
  if (!Array.isArray(badges)) {
    return [];
  }
  return badges
    .map((badge) => ({
      name: typeof badge?.name === "string" ? badge.name : "",
      icon_url: typeof badge?.icon_url === "string" ? badge.icon_url : "",
    }))
    .filter((badge) => badge.name || badge.icon_url);
}

function normalizeAuthorSnapshot(snapshotInput) {
  const snapshot = snapshotInput && typeof snapshotInput === "object" ? snapshotInput : {};
  return {
    display_name: typeof snapshot.display_name === "string" ? snapshot.display_name : "",
    avatar_url: typeof snapshot.avatar_url === "string" ? snapshot.avatar_url : "",
    signature_text: typeof snapshot.signature_text === "string" ? snapshot.signature_text : "",
    user_group_name: typeof snapshot.user_group_name === "string" ? snapshot.user_group_name : "",
    user_title: typeof snapshot.user_title === "string" ? snapshot.user_title : "",
    board_title: typeof snapshot.board_title === "string" ? snapshot.board_title : "",
    points_display: snapshot.points_display ?? "0",
    post_count_display: snapshot.post_count_display ?? "0",
    essence_count_display: snapshot.essence_count_display ?? "0",
    registered_at_display:
      typeof snapshot.registered_at_display === "string" ? snapshot.registered_at_display : "",
    location_display: typeof snapshot.location_display === "string" ? snapshot.location_display : "",
    badges: normalizeBadgeList(snapshot.badges),
  };
}

function pickThreadAuthor(snapshotJson) {
  const snapshot = normalizeAuthorSnapshot(parseJsonField(snapshotJson, {}));
  return {
    display_name: snapshot.display_name,
    avatar_url: snapshot.avatar_url,
    user_title: snapshot.user_title,
    user_group_name: snapshot.user_group_name,
  };
}

function resolveSiteMeta(db) {
  let cols = tableColumnsCache.get("site_settings");
  if (!cols) {
    const rawCols = db.prepare("PRAGMA table_info(site_settings)").all();
    cols = new Set(rawCols.map((row) => row.name));
    tableColumnsCache.set("site_settings", cols);
  }

  if (cols.has("site_name") && cols.has("site_subtitle")) {
    const row = db
      .prepare(
        `
        SELECT
          site_name,
          site_subtitle,
          announcement,
          footer_text,
          default_page_size
        FROM site_settings
        ORDER BY id DESC
        LIMIT 1
        `,
      )
      .get();

    if (!row) {
      return { ...DEFAULT_SITE_META };
    }

    return {
      name: row.site_name || DEFAULT_SITE_META.name,
      subtitle: row.site_subtitle || DEFAULT_SITE_META.subtitle,
      announcement_html: row.announcement || "",
      footer_text: row.footer_text || "",
      default_page_size: toPositiveInt(row.default_page_size, DEFAULT_SITE_META.default_page_size),
    };
  }

  if (cols.has("key") && cols.has("value_json")) {
    const rows = db.prepare("SELECT key, value_json FROM site_settings").all();
    const kv = new Map(rows.map((row) => [row.key, parseJsonField(row.value_json, null)]));
    return {
      name:
        typeof kv.get("site_name") === "string" && kv.get("site_name")
          ? kv.get("site_name")
          : DEFAULT_SITE_META.name,
      subtitle:
        typeof kv.get("site_subtitle") === "string" && kv.get("site_subtitle")
          ? kv.get("site_subtitle")
          : DEFAULT_SITE_META.subtitle,
      announcement_html:
        typeof kv.get("announcement_html") === "string" ? kv.get("announcement_html") : "",
      footer_text:
        typeof kv.get("footer_text") === "string" ? kv.get("footer_text") : DEFAULT_SITE_META.footer_text,
      default_page_size: toPositiveInt(kv.get("default_page_size"), DEFAULT_SITE_META.default_page_size),
    };
  }

  return { ...DEFAULT_SITE_META };
}

function buildPagination({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickKnownFields(input, allowed) {
  const picked = {};
  for (const key of Object.keys(input)) {
    if (allowed.has(key)) {
      picked[key] = input[key];
    }
  }
  return picked;
}

function findUnknownFields(input, allowed) {
  return Object.keys(input).filter((key) => !allowed.has(key));
}

function normalizeBooleanToInt(input) {
  if (input === true || input === 1 || input === "1" || input === "true") {
    return 1;
  }
  if (input === false || input === 0 || input === "0" || input === "false") {
    return 0;
  }
  return null;
}

function normalizeInteger(input) {
  const n = Number(input);
  if (!Number.isInteger(n)) {
    return null;
  }
  return n;
}

function normalizeNullableInteger(input) {
  if (input === null) {
    return null;
  }
  return normalizeInteger(input);
}

function normalizeNumber(input) {
  const n = Number(input);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

function normalizeJsonInput(value, expectedType) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { ok: false, message: "Invalid JSON string" };
    }
  }

  if (expectedType === "array" && !Array.isArray(parsed)) {
    return { ok: false, message: "Expected JSON array" };
  }
  if (expectedType === "object" && !isPlainObject(parsed)) {
    return { ok: false, message: "Expected JSON object" };
  }

  return {
    ok: true,
    value: JSON.stringify(parsed),
  };
}

function parseId(rawId) {
  const id = toPositiveInt(rawId, 0);
  if (!id) {
    return null;
  }
  return id;
}

function insertRow(db, table, payload) {
  const keys = Object.keys(payload);
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
  const values = keys.map((key) => payload[key]);
  const result = db.prepare(sql).run(...values);
  return result.lastInsertRowid;
}

function updateRowById(db, table, id, payload) {
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return 0;
  }
  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const sql = `UPDATE ${table} SET ${assignments} WHERE id = ?`;
  const values = keys.map((key) => payload[key]);
  const result = db.prepare(sql).run(...values, id);
  return result.changes;
}

function getRowById(db, table, id) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`).get(id);
}

function parseJsonColumns(row, columns) {
  if (!row) {
    return null;
  }
  const out = { ...row };
  for (const column of columns) {
    out[column] = parseJsonField(row[column], row[column] ?? null);
  }
  return out;
}

function isConstraintError(error) {
  return typeof error?.code === "string" && error.code.startsWith("SQLITE_CONSTRAINT");
}

function buildServer() {
  const app = Fastify({
    logger: true,
  });
  const db = getDb();
  const adminApiKey = config.ADMIN_API_KEY ?? "";
  void adminApiKey;

  function getObjectBody(request, reply) {
    const body = request.body ?? {};
    if (!isPlainObject(body)) {
      reply.code(400).send(fail("INVALID_ARGUMENT", "Request body must be a JSON object"));
      return null;
    }
    return body;
  }

  function rejectUnknownBodyFields(body, allowedFields, reply) {
    const unknownFields = findUnknownFields(body, allowedFields);
    if (unknownFields.length > 0) {
      reply
        .code(400)
        .send(fail("INVALID_ARGUMENT", `Unknown fields: ${unknownFields.join(", ")}`));
      return true;
    }
    return false;
  }

  function withConstraintGuard(reply, runner) {
    try {
      return runner();
    } catch (error) {
      if (isConstraintError(error)) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", error.message));
      }
      throw error;
    }
  }

  app.get("/health", async () => {
    return ok({
      status: "up",
    });
  });

  app.get("/api/site-meta", async () => {
    const site = resolveSiteMeta(db);
    return ok({
      name: site.name,
      subtitle: site.subtitle,
      announcement_html: site.announcement_html,
      footer_text: site.footer_text,
      default_page_size: site.default_page_size,
    });
  });

  app.get("/api/home", async () => {
    const site = resolveSiteMeta(db);

    const stats = db
      .prepare(
        `
        SELECT
          COALESCE(SUM(CASE WHEN substr(p.published_at, 1, 10) = date('now') THEN 1 ELSE 0 END), 0) AS today_posts_display,
          COALESCE(SUM(CASE WHEN substr(p.published_at, 1, 10) = date('now', '-1 day') THEN 1 ELSE 0 END), 0) AS yesterday_posts_display
        FROM posts p
        JOIN threads t ON t.id = p.thread_id
        JOIN boards b ON b.id = t.board_id
        WHERE p.status = 'published'
          AND t.status = 'published'
          AND b.is_enabled = 1
        `,
      )
      .get();

    const totalThreadsRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total_threads_display
        FROM threads t
        JOIN boards b ON b.id = t.board_id
        WHERE t.status = 'published'
          AND b.is_enabled = 1
        `,
      )
      .get();

    const onlineUsersRow = db
      .prepare(
        `
        SELECT COUNT(*) AS online_users_display
        FROM personas
        WHERE is_enabled = 1
        `,
      )
      .get();

    const boards = db
      .prepare(
        `
        SELECT
          b.id,
          b.name,
          b.slug,
          b.description,
          COUNT(DISTINCT t.id) AS thread_count_display,
          COUNT(p.id) AS post_count_display,
          lt.id AS latest_thread_id,
          lt.title AS latest_thread_title,
          lt.published_at AS latest_thread_published_at
        FROM boards b
        LEFT JOIN threads t
          ON t.board_id = b.id
         AND t.status = 'published'
        LEFT JOIN posts p
          ON p.thread_id = t.id
         AND p.status = 'published'
        LEFT JOIN threads lt
          ON lt.id = (
            SELECT t2.id
            FROM threads t2
            WHERE t2.board_id = b.id
              AND t2.status = 'published'
            ORDER BY COALESCE(t2.published_at, t2.created_at) DESC, t2.id DESC
            LIMIT 1
          )
        WHERE b.is_enabled = 1
        GROUP BY
          b.id,
          b.name,
          b.slug,
          b.description,
          lt.id,
          lt.title,
          lt.published_at
        ORDER BY b.sort_order ASC, b.id ASC
        `,
      )
      .all()
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        thread_count_display: row.thread_count_display,
        post_count_display: row.post_count_display,
        latest_thread: row.latest_thread_id
          ? {
              id: row.latest_thread_id,
              title: row.latest_thread_title,
              published_at: row.latest_thread_published_at,
            }
          : null,
      }));

    return ok({
      site: {
        name: site.name,
        subtitle: site.subtitle,
        announcement_html: site.announcement_html,
      },
      stats: {
        today_posts_display: stats.today_posts_display,
        yesterday_posts_display: stats.yesterday_posts_display,
        total_threads_display: totalThreadsRow.total_threads_display,
        online_users_display: onlineUsersRow.online_users_display,
      },
      boards,
    });
  });

  app.get("/api/boards", async (request) => {
    const includeStats = request.query?.includeStats === "true";

    const rows = db
      .prepare(
        `
        SELECT
          b.id,
          b.name,
          b.slug,
          b.description,
          COUNT(DISTINCT t.id) AS thread_count_display,
          COUNT(p.id) AS post_count_display
        FROM boards b
        LEFT JOIN threads t
          ON t.board_id = b.id
         AND t.status = 'published'
        LEFT JOIN posts p
          ON p.thread_id = t.id
         AND p.status = 'published'
        WHERE b.is_enabled = 1
        GROUP BY b.id, b.name, b.slug, b.description
        ORDER BY b.sort_order ASC, b.id ASC
        `,
      )
      .all();

    const boards = rows.map((row) => {
      const base = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
      };
      if (!includeStats) {
        return base;
      }
      return {
        ...base,
        thread_count_display: row.thread_count_display,
        post_count_display: row.post_count_display,
      };
    });

    return ok({
      boards,
    });
  });

  app.get("/api/boards/:slug", async (request, reply) => {
    const board = db
      .prepare(
        `
        SELECT id, name, slug, description
        FROM boards
        WHERE slug = ?
          AND is_enabled = 1
        LIMIT 1
        `,
      )
      .get(request.params.slug);

    if (!board) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Board not found"));
    }

    const site = resolveSiteMeta(db);
    const page = toPositiveInt(request.query?.page, 1);
    const pageSize = toPositiveInt(request.query?.pageSize, site.default_page_size);
    const offset = (page - 1) * pageSize;

    const pinnedThreads = db
      .prepare(
        `
        SELECT
          t.id,
          t.title,
          t.reply_count,
          t.view_count_display,
          t.published_at,
          t.last_replied_at,
          t.snapshot_json
        FROM threads t
        WHERE t.board_id = ?
          AND t.status = 'published'
          AND t.is_pinned = 1
        ORDER BY COALESCE(t.last_replied_at, t.published_at, t.created_at) DESC, t.id DESC
        `,
      )
      .all(board.id)
      .map((row) => ({
        id: row.id,
        title: row.title,
        reply_count: row.reply_count,
        view_count_display: row.view_count_display,
        published_at: row.published_at,
        last_replied_at: row.last_replied_at,
        author: pickThreadAuthor(row.snapshot_json),
      }));

    const totalRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM threads
        WHERE board_id = ?
          AND status = 'published'
          AND is_pinned = 0
        `,
      )
      .get(board.id);

    const threads = db
      .prepare(
        `
        SELECT
          t.id,
          t.title,
          t.reply_count,
          t.view_count_display,
          t.published_at,
          t.last_replied_at,
          t.snapshot_json
        FROM threads t
        WHERE t.board_id = ?
          AND t.status = 'published'
          AND t.is_pinned = 0
        ORDER BY COALESCE(t.last_replied_at, t.published_at, t.created_at) DESC, t.id DESC
        LIMIT ?
        OFFSET ?
        `,
      )
      .all(board.id, pageSize, offset)
      .map((row) => ({
        id: row.id,
        title: row.title,
        reply_count: row.reply_count,
        view_count_display: row.view_count_display,
        published_at: row.published_at,
        last_replied_at: row.last_replied_at,
        author: pickThreadAuthor(row.snapshot_json),
      }));

    return ok({
      board,
      pinned_threads: pinnedThreads,
      threads,
      pagination: buildPagination({
        page,
        pageSize,
        total: totalRow.total,
      }),
    });
  });

  app.get("/api/threads/:id", async (request, reply) => {
    const threadId = toPositiveInt(request.params.id, 0);
    if (!threadId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid thread id"));
    }

    const threadRow = db
      .prepare(
        `
        SELECT
          t.id,
          t.title,
          t.published_at,
          t.rendered_html,
          t.snapshot_json,
          b.id AS board_id,
          b.name AS board_name,
          b.slug AS board_slug
        FROM threads t
        JOIN boards b ON b.id = t.board_id
        WHERE t.id = ?
          AND t.status = 'published'
          AND b.is_enabled = 1
        LIMIT 1
        `,
      )
      .get(threadId);

    if (!threadRow) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Thread not found"));
    }

    const site = resolveSiteMeta(db);
    const page = 1;
    const pageSize = toPositiveInt(request.query?.pageSize, site.default_page_size);
    const postsCountRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM posts
        WHERE thread_id = ?
          AND status = 'published'
          AND floor_number > 1
        `,
      )
      .get(threadId);

    return ok({
      board: {
        id: threadRow.board_id,
        name: threadRow.board_name,
        slug: threadRow.board_slug,
      },
      thread: {
        id: threadRow.id,
        title: threadRow.title,
        published_at: threadRow.published_at,
        content_html: threadRow.rendered_html,
        author_snapshot: normalizeAuthorSnapshot(parseJsonField(threadRow.snapshot_json, {})),
      },
      pagination: buildPagination({
        page,
        pageSize,
        total: postsCountRow.total + 1,
      }),
    });
  });

  app.get("/api/threads/:id/posts", async (request, reply) => {
    const threadId = toPositiveInt(request.params.id, 0);
    if (!threadId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid thread id"));
    }

    const threadExists = db
      .prepare(
        `
        SELECT t.id
        FROM threads t
        JOIN boards b ON b.id = t.board_id
        WHERE t.id = ?
          AND t.status = 'published'
          AND b.is_enabled = 1
        LIMIT 1
        `,
      )
      .get(threadId);

    if (!threadExists) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Thread not found"));
    }

    const site = resolveSiteMeta(db);
    const page = toPositiveInt(request.query?.page, 1);
    const pageSize = toPositiveInt(request.query?.pageSize, site.default_page_size);
    const offset = (page - 1) * pageSize;

    const totalRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM posts
        WHERE thread_id = ?
          AND status = 'published'
          AND floor_number > 1
        `,
      )
      .get(threadId);

    const posts = db
      .prepare(
        `
        SELECT
          id,
          floor_number,
          published_at,
          rendered_html,
          snapshot_json
        FROM posts
        WHERE thread_id = ?
          AND status = 'published'
          AND floor_number > 1
        ORDER BY floor_number ASC, id ASC
        LIMIT ?
        OFFSET ?
        `,
      )
      .all(threadId, pageSize, offset)
      .map((row) => ({
        id: row.id,
        floor_number: row.floor_number,
        published_at: row.published_at,
        content_html: row.rendered_html,
        author_snapshot: normalizeAuthorSnapshot(parseJsonField(row.snapshot_json, {})),
      }));

    return ok({
      posts,
      pagination: buildPagination({
        page,
        pageSize,
        total: totalRow.total,
      }),
    });
  });

  app.post("/internal/boards", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }

    const allowedFields = new Set([
      "name",
      "slug",
      "description",
      "sort_order",
      "is_enabled",
      "is_hidden",
      "theme_prompt",
      "posting_frequency",
      "reply_density",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "name is required"));
    }
    if (typeof body.slug !== "string" || !body.slug.trim()) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "slug is required"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.name = body.name.trim();
    payload.slug = body.slug.trim();

    if (Object.prototype.hasOwnProperty.call(payload, "sort_order")) {
      const value = normalizeInteger(payload.sort_order);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "sort_order must be an integer"));
      }
      payload.sort_order = value;
    }

    for (const field of ["is_enabled", "is_hidden"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeBooleanToInt(payload[field]);
        if (value === null) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be a boolean`));
        }
        payload[field] = value;
      }
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "boards", payload);
      const row = getRowById(db, "boards", id);
      return reply.code(201).send(ok(row));
    });
  });

  app.patch("/internal/boards/:id", async (request, reply) => {
    const boardId = parseId(request.params.id);
    if (!boardId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid board id"));
    }

    if (!getRowById(db, "boards", boardId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Board not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }

    const allowedFields = new Set([
      "name",
      "slug",
      "description",
      "sort_order",
      "is_enabled",
      "is_hidden",
      "theme_prompt",
      "posting_frequency",
      "reply_density",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      if (typeof payload.name !== "string" || !payload.name.trim()) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "name must be a non-empty string"));
      }
      payload.name = payload.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, "slug")) {
      if (typeof payload.slug !== "string" || !payload.slug.trim()) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "slug must be a non-empty string"));
      }
      payload.slug = payload.slug.trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, "sort_order")) {
      const value = normalizeInteger(payload.sort_order);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "sort_order must be an integer"));
      }
      payload.sort_order = value;
    }
    for (const field of ["is_enabled", "is_hidden"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeBooleanToInt(payload[field]);
        if (value === null) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be a boolean`));
        }
        payload[field] = value;
      }
    }

    payload.updated_at = new Date().toISOString();
    return withConstraintGuard(reply, () => {
      updateRowById(db, "boards", boardId, payload);
      const row = getRowById(db, "boards", boardId);
      return reply.send(ok(row));
    });
  });

  app.post("/internal/boards/:id/enable", async (request, reply) => {
    const boardId = parseId(request.params.id);
    if (!boardId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid board id"));
    }
    const changes = updateRowById(db, "boards", boardId, {
      is_enabled: 1,
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Board not found"));
    }
    return reply.send(ok(getRowById(db, "boards", boardId)));
  });

  app.post("/internal/boards/:id/disable", async (request, reply) => {
    const boardId = parseId(request.params.id);
    if (!boardId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid board id"));
    }
    const changes = updateRowById(db, "boards", boardId, {
      is_enabled: 0,
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Board not found"));
    }
    return reply.send(ok(getRowById(db, "boards", boardId)));
  });

  app.get("/internal/boards", async () => {
    const rows = db.prepare("SELECT * FROM boards ORDER BY sort_order ASC, id ASC").all();
    return ok({
      boards: rows,
    });
  });

  app.get("/internal/boards/:id", async (request, reply) => {
    const boardId = parseId(request.params.id);
    if (!boardId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid board id"));
    }
    const row = getRowById(db, "boards", boardId);
    if (!row) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Board not found"));
    }
    return ok(row);
  });

  app.post("/internal/personas", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }

    const allowedFields = new Set([
      "internal_name",
      "bio_prompt",
      "tone_style",
      "activity_level",
      "preferred_boards_json",
      "interaction_preferences_json",
      "allow_alias_switching",
      "alias_switch_rate",
      "favorite_emoticons_json",
      "common_phrases_json",
      "banned_phrases_json",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }
    if (typeof body.internal_name !== "string" || !body.internal_name.trim()) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "internal_name is required"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.internal_name = body.internal_name.trim();

    const jsonSpecs = [
      ["preferred_boards_json", "array"],
      ["interaction_preferences_json", "object"],
      ["favorite_emoticons_json", "array"],
      ["common_phrases_json", "array"],
      ["banned_phrases_json", "array"],
    ];
    for (const [field, type] of jsonSpecs) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const parsed = normalizeJsonInput(payload[field], type);
        if (!parsed.ok) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field}: ${parsed.message}`));
        }
        payload[field] = parsed.value;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "allow_alias_switching")) {
      const value = normalizeBooleanToInt(payload.allow_alias_switching);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "allow_alias_switching must be a boolean"));
      }
      payload.allow_alias_switching = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "alias_switch_rate")) {
      const value = normalizeNumber(payload.alias_switch_rate);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "alias_switch_rate must be a number"));
      }
      payload.alias_switch_rate = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "personas", payload);
      const row = parseJsonColumns(getRowById(db, "personas", id), [
        "preferred_boards_json",
        "interaction_preferences_json",
        "favorite_emoticons_json",
        "common_phrases_json",
        "banned_phrases_json",
      ]);
      return reply.code(201).send(ok(row));
    });
  });

  app.patch("/internal/personas/:id", async (request, reply) => {
    const personaId = parseId(request.params.id);
    if (!personaId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid persona id"));
    }
    if (!getRowById(db, "personas", personaId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Persona not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "internal_name",
      "bio_prompt",
      "tone_style",
      "activity_level",
      "preferred_boards_json",
      "interaction_preferences_json",
      "allow_alias_switching",
      "alias_switch_rate",
      "favorite_emoticons_json",
      "common_phrases_json",
      "banned_phrases_json",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    if (Object.prototype.hasOwnProperty.call(payload, "internal_name")) {
      if (typeof payload.internal_name !== "string" || !payload.internal_name.trim()) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "internal_name must be a non-empty string"));
      }
      payload.internal_name = payload.internal_name.trim();
    }

    const jsonSpecs = [
      ["preferred_boards_json", "array"],
      ["interaction_preferences_json", "object"],
      ["favorite_emoticons_json", "array"],
      ["common_phrases_json", "array"],
      ["banned_phrases_json", "array"],
    ];
    for (const [field, type] of jsonSpecs) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const parsed = normalizeJsonInput(payload[field], type);
        if (!parsed.ok) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field}: ${parsed.message}`));
        }
        payload[field] = parsed.value;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "allow_alias_switching")) {
      const value = normalizeBooleanToInt(payload.allow_alias_switching);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "allow_alias_switching must be a boolean"));
      }
      payload.allow_alias_switching = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "alias_switch_rate")) {
      const value = normalizeNumber(payload.alias_switch_rate);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "alias_switch_rate must be a number"));
      }
      payload.alias_switch_rate = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }
    payload.updated_at = new Date().toISOString();

    return withConstraintGuard(reply, () => {
      updateRowById(db, "personas", personaId, payload);
      const row = parseJsonColumns(getRowById(db, "personas", personaId), [
        "preferred_boards_json",
        "interaction_preferences_json",
        "favorite_emoticons_json",
        "common_phrases_json",
        "banned_phrases_json",
      ]);
      return reply.send(ok(row));
    });
  });

  app.post("/internal/personas/:id/enable", async (request, reply) => {
    const personaId = parseId(request.params.id);
    if (!personaId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid persona id"));
    }
    const changes = updateRowById(db, "personas", personaId, {
      is_enabled: 1,
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Persona not found"));
    }
    const row = parseJsonColumns(getRowById(db, "personas", personaId), [
      "preferred_boards_json",
      "interaction_preferences_json",
      "favorite_emoticons_json",
      "common_phrases_json",
      "banned_phrases_json",
    ]);
    return reply.send(ok(row));
  });

  app.post("/internal/personas/:id/disable", async (request, reply) => {
    const personaId = parseId(request.params.id);
    if (!personaId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid persona id"));
    }
    const changes = updateRowById(db, "personas", personaId, {
      is_enabled: 0,
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Persona not found"));
    }
    const row = parseJsonColumns(getRowById(db, "personas", personaId), [
      "preferred_boards_json",
      "interaction_preferences_json",
      "favorite_emoticons_json",
      "common_phrases_json",
      "banned_phrases_json",
    ]);
    return reply.send(ok(row));
  });

  app.get("/internal/personas", async () => {
    const rows = db.prepare("SELECT * FROM personas ORDER BY id ASC").all();
    return ok({
      personas: rows.map((row) =>
        parseJsonColumns(row, [
          "preferred_boards_json",
          "interaction_preferences_json",
          "favorite_emoticons_json",
          "common_phrases_json",
          "banned_phrases_json",
        ]),
      ),
    });
  });

  app.get("/internal/personas/:id", async (request, reply) => {
    const personaId = parseId(request.params.id);
    if (!personaId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid persona id"));
    }
    const row = parseJsonColumns(getRowById(db, "personas", personaId), [
      "preferred_boards_json",
      "interaction_preferences_json",
      "favorite_emoticons_json",
      "common_phrases_json",
      "banned_phrases_json",
    ]);
    if (!row) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Persona not found"));
    }
    return ok(row);
  });

  app.post("/internal/identity-presets", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "persona_id",
      "display_name",
      "avatar_asset_id",
      "signature_text",
      "user_group_name",
      "user_title",
      "board_title_default",
      "points_display",
      "post_count_display",
      "essence_count_display",
      "registered_at_display",
      "location_display",
      "badge_ids_json",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(body, "persona_id")) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "persona_id is required"));
    }
    if (typeof body.display_name !== "string" || !body.display_name.trim()) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "display_name is required"));
    }

    const personaId = normalizeInteger(body.persona_id);
    if (personaId === null || personaId < 1) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "persona_id must be a positive integer"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.persona_id = personaId;
    payload.display_name = body.display_name.trim();

    if (Object.prototype.hasOwnProperty.call(payload, "avatar_asset_id")) {
      const avatarAssetId = normalizeNullableInteger(payload.avatar_asset_id);
      if (avatarAssetId === null && payload.avatar_asset_id !== null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "avatar_asset_id must be an integer or null"));
      }
      if (avatarAssetId !== null && avatarAssetId < 1) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "avatar_asset_id must be positive"));
      }
      payload.avatar_asset_id = avatarAssetId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "badge_ids_json")) {
      const parsed = normalizeJsonInput(payload.badge_ids_json, "array");
      if (!parsed.ok) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `badge_ids_json: ${parsed.message}`));
      }
      payload.badge_ids_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "identity_presets", payload);
      const row = parseJsonColumns(getRowById(db, "identity_presets", id), ["badge_ids_json"]);
      return reply.code(201).send(ok(row));
    });
  });

  app.patch("/internal/identity-presets/:id", async (request, reply) => {
    const presetId = parseId(request.params.id);
    if (!presetId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid identity preset id"));
    }
    if (!getRowById(db, "identity_presets", presetId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Identity preset not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "persona_id",
      "display_name",
      "avatar_asset_id",
      "signature_text",
      "user_group_name",
      "user_title",
      "board_title_default",
      "points_display",
      "post_count_display",
      "essence_count_display",
      "registered_at_display",
      "location_display",
      "badge_ids_json",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    if (Object.prototype.hasOwnProperty.call(payload, "persona_id")) {
      const personaId = normalizeInteger(payload.persona_id);
      if (personaId === null || personaId < 1) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "persona_id must be a positive integer"));
      }
      payload.persona_id = personaId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "display_name")) {
      if (typeof payload.display_name !== "string" || !payload.display_name.trim()) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "display_name must be a non-empty string"));
      }
      payload.display_name = payload.display_name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, "avatar_asset_id")) {
      const avatarAssetId = normalizeNullableInteger(payload.avatar_asset_id);
      if (avatarAssetId === null && payload.avatar_asset_id !== null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "avatar_asset_id must be an integer or null"));
      }
      if (avatarAssetId !== null && avatarAssetId < 1) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "avatar_asset_id must be positive"));
      }
      payload.avatar_asset_id = avatarAssetId;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "badge_ids_json")) {
      const parsed = normalizeJsonInput(payload.badge_ids_json, "array");
      if (!parsed.ok) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `badge_ids_json: ${parsed.message}`));
      }
      payload.badge_ids_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }
    payload.updated_at = new Date().toISOString();

    return withConstraintGuard(reply, () => {
      updateRowById(db, "identity_presets", presetId, payload);
      const row = parseJsonColumns(getRowById(db, "identity_presets", presetId), ["badge_ids_json"]);
      return reply.send(ok(row));
    });
  });

  app.post("/internal/identity-presets/:id/enable", async (request, reply) => {
    const presetId = parseId(request.params.id);
    if (!presetId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid identity preset id"));
    }
    const changes = updateRowById(db, "identity_presets", presetId, {
      is_enabled: 1,
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Identity preset not found"));
    }
    const row = parseJsonColumns(getRowById(db, "identity_presets", presetId), ["badge_ids_json"]);
    return reply.send(ok(row));
  });

  app.post("/internal/identity-presets/:id/disable", async (request, reply) => {
    const presetId = parseId(request.params.id);
    if (!presetId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid identity preset id"));
    }
    const changes = updateRowById(db, "identity_presets", presetId, {
      is_enabled: 0,
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Identity preset not found"));
    }
    const row = parseJsonColumns(getRowById(db, "identity_presets", presetId), ["badge_ids_json"]);
    return reply.send(ok(row));
  });

  app.get("/internal/identity-presets", async () => {
    const rows = db.prepare("SELECT * FROM identity_presets ORDER BY id ASC").all();
    return ok({
      identity_presets: rows.map((row) => parseJsonColumns(row, ["badge_ids_json"])),
    });
  });

  app.post("/internal/persona-board-profiles", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "persona_id",
      "board_id",
      "preferred_identity_preset_ids_json",
      "board_title_override",
      "tone_offset_prompt",
      "activity_weight",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(body, "persona_id")) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "persona_id is required"));
    }
    if (!Object.prototype.hasOwnProperty.call(body, "board_id")) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "board_id is required"));
    }

    const personaId = normalizeInteger(body.persona_id);
    const boardId = normalizeInteger(body.board_id);
    if (personaId === null || personaId < 1 || boardId === null || boardId < 1) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "persona_id and board_id must be positive integers"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.persona_id = personaId;
    payload.board_id = boardId;

    if (Object.prototype.hasOwnProperty.call(payload, "preferred_identity_preset_ids_json")) {
      const parsed = normalizeJsonInput(payload.preferred_identity_preset_ids_json, "array");
      if (!parsed.ok) {
        return reply
          .code(400)
          .send(fail("INVALID_ARGUMENT", `preferred_identity_preset_ids_json: ${parsed.message}`));
      }
      payload.preferred_identity_preset_ids_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "activity_weight")) {
      const value = normalizeNumber(payload.activity_weight);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "activity_weight must be a number"));
      }
      payload.activity_weight = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "persona_board_profiles", payload);
      const row = parseJsonColumns(getRowById(db, "persona_board_profiles", id), [
        "preferred_identity_preset_ids_json",
      ]);
      return reply.code(201).send(ok(row));
    });
  });

  app.patch("/internal/persona-board-profiles/:id", async (request, reply) => {
    const profileId = parseId(request.params.id);
    if (!profileId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid persona board profile id"));
    }
    if (!getRowById(db, "persona_board_profiles", profileId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Persona board profile not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "persona_id",
      "board_id",
      "preferred_identity_preset_ids_json",
      "board_title_override",
      "tone_offset_prompt",
      "activity_weight",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    for (const field of ["persona_id", "board_id"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeInteger(payload[field]);
        if (value === null || value < 1) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be a positive integer`));
        }
        payload[field] = value;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "preferred_identity_preset_ids_json")) {
      const parsed = normalizeJsonInput(payload.preferred_identity_preset_ids_json, "array");
      if (!parsed.ok) {
        return reply
          .code(400)
          .send(fail("INVALID_ARGUMENT", `preferred_identity_preset_ids_json: ${parsed.message}`));
      }
      payload.preferred_identity_preset_ids_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "activity_weight")) {
      const value = normalizeNumber(payload.activity_weight);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "activity_weight must be a number"));
      }
      payload.activity_weight = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }
    payload.updated_at = new Date().toISOString();

    return withConstraintGuard(reply, () => {
      updateRowById(db, "persona_board_profiles", profileId, payload);
      const row = parseJsonColumns(getRowById(db, "persona_board_profiles", profileId), [
        "preferred_identity_preset_ids_json",
      ]);
      return reply.send(ok(row));
    });
  });

  app.get("/internal/persona-board-profiles", async () => {
    const rows = db.prepare("SELECT * FROM persona_board_profiles ORDER BY id ASC").all();
    return ok({
      persona_board_profiles: rows.map((row) => parseJsonColumns(row, ["preferred_identity_preset_ids_json"])),
    });
  });

  app.post("/internal/media-assets", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "type",
      "name",
      "file_path",
      "public_url",
      "mime_type",
      "width",
      "height",
      "tags_json",
      "source_note",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }
    for (const field of ["type", "name", "file_path", "public_url"]) {
      if (typeof body[field] !== "string" || !body[field].trim()) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} is required`));
      }
    }
    const allowedTypes = new Set(["avatar", "emoticon", "badge", "icon"]);
    if (!allowedTypes.has(body.type)) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "type must be avatar|emoticon|badge|icon"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.type = body.type;
    payload.name = body.name.trim();
    payload.file_path = body.file_path.trim();
    payload.public_url = body.public_url.trim();

    for (const field of ["width", "height"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeNullableInteger(payload[field]);
        if (value === null && payload[field] !== null) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be an integer or null`));
        }
        if (value !== null && value < 1) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be positive`));
        }
        payload[field] = value;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "tags_json")) {
      const parsed = normalizeJsonInput(payload.tags_json, "array");
      if (!parsed.ok) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `tags_json: ${parsed.message}`));
      }
      payload.tags_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "media_assets", payload);
      const row = parseJsonColumns(getRowById(db, "media_assets", id), ["tags_json"]);
      return reply.code(201).send(ok(row));
    });
  });

  app.get("/internal/media-assets", async () => {
    const rows = db.prepare("SELECT * FROM media_assets ORDER BY id ASC").all();
    return ok({
      media_assets: rows.map((row) => parseJsonColumns(row, ["tags_json"])),
    });
  });

  app.patch("/internal/media-assets/:id", async (request, reply) => {
    const assetId = parseId(request.params.id);
    if (!assetId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid media asset id"));
    }
    if (!getRowById(db, "media_assets", assetId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Media asset not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "type",
      "name",
      "file_path",
      "public_url",
      "mime_type",
      "width",
      "height",
      "tags_json",
      "source_note",
      "is_enabled",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    if (Object.prototype.hasOwnProperty.call(payload, "type")) {
      const allowedTypes = new Set(["avatar", "emoticon", "badge", "icon"]);
      if (!allowedTypes.has(payload.type)) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "type must be avatar|emoticon|badge|icon"));
      }
    }
    for (const field of ["name", "file_path", "public_url"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        if (typeof payload[field] !== "string" || !payload[field].trim()) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be a non-empty string`));
        }
        payload[field] = payload[field].trim();
      }
    }
    for (const field of ["width", "height"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeNullableInteger(payload[field]);
        if (value === null && payload[field] !== null) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be an integer or null`));
        }
        if (value !== null && value < 1) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be positive`));
        }
        payload[field] = value;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "tags_json")) {
      const parsed = normalizeJsonInput(payload.tags_json, "array");
      if (!parsed.ok) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `tags_json: ${parsed.message}`));
      }
      payload.tags_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }
    payload.updated_at = new Date().toISOString();

    return withConstraintGuard(reply, () => {
      updateRowById(db, "media_assets", assetId, payload);
      const row = parseJsonColumns(getRowById(db, "media_assets", assetId), ["tags_json"]);
      return reply.send(ok(row));
    });
  });

  app.post("/internal/media-assets/:id/disable", async (request, reply) => {
    const assetId = parseId(request.params.id);
    if (!assetId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid media asset id"));
    }
    const changes = updateRowById(db, "media_assets", assetId, {
      is_enabled: 0,
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Media asset not found"));
    }
    const row = parseJsonColumns(getRowById(db, "media_assets", assetId), ["tags_json"]);
    return reply.send(ok(row));
  });

  app.post("/internal/emoticon-packs", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set(["name", "code_prefix", "description", "sort_order", "is_enabled"]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }
    if (typeof body.name !== "string" || !body.name.trim()) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "name is required"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.name = body.name.trim();
    if (Object.prototype.hasOwnProperty.call(payload, "sort_order")) {
      const value = normalizeInteger(payload.sort_order);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "sort_order must be an integer"));
      }
      payload.sort_order = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "emoticon_packs", payload);
      return reply.code(201).send(ok(getRowById(db, "emoticon_packs", id)));
    });
  });

  app.patch("/internal/emoticon-packs/:id", async (request, reply) => {
    const packId = parseId(request.params.id);
    if (!packId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid emoticon pack id"));
    }
    if (!getRowById(db, "emoticon_packs", packId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Emoticon pack not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set(["name", "code_prefix", "description", "sort_order", "is_enabled"]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      if (typeof payload.name !== "string" || !payload.name.trim()) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "name must be a non-empty string"));
      }
      payload.name = payload.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, "sort_order")) {
      const value = normalizeInteger(payload.sort_order);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "sort_order must be an integer"));
      }
      payload.sort_order = value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }
    payload.updated_at = new Date().toISOString();

    return withConstraintGuard(reply, () => {
      updateRowById(db, "emoticon_packs", packId, payload);
      return reply.send(ok(getRowById(db, "emoticon_packs", packId)));
    });
  });

  app.post("/internal/emoticons", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set(["pack_id", "asset_id", "code", "aliases_json", "label", "is_enabled"]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }
    for (const field of ["pack_id", "asset_id"]) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} is required`));
      }
      const value = normalizeInteger(body[field]);
      if (value === null || value < 1) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be a positive integer`));
      }
    }
    if (typeof body.code !== "string" || !body.code.trim()) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "code is required"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.pack_id = normalizeInteger(body.pack_id);
    payload.asset_id = normalizeInteger(body.asset_id);
    payload.code = body.code.trim();

    if (Object.prototype.hasOwnProperty.call(payload, "aliases_json")) {
      const parsed = normalizeJsonInput(payload.aliases_json, "array");
      if (!parsed.ok) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `aliases_json: ${parsed.message}`));
      }
      payload.aliases_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "emoticons", payload);
      const row = parseJsonColumns(getRowById(db, "emoticons", id), ["aliases_json"]);
      return reply.code(201).send(ok(row));
    });
  });

  app.patch("/internal/emoticons/:id", async (request, reply) => {
    const emoticonId = parseId(request.params.id);
    if (!emoticonId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid emoticon id"));
    }
    if (!getRowById(db, "emoticons", emoticonId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Emoticon not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set(["pack_id", "asset_id", "code", "aliases_json", "label", "is_enabled"]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    for (const field of ["pack_id", "asset_id"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeInteger(payload[field]);
        if (value === null || value < 1) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be a positive integer`));
        }
        payload[field] = value;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "code")) {
      if (typeof payload.code !== "string" || !payload.code.trim()) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "code must be a non-empty string"));
      }
      payload.code = payload.code.trim();
    }
    if (Object.prototype.hasOwnProperty.call(payload, "aliases_json")) {
      const parsed = normalizeJsonInput(payload.aliases_json, "array");
      if (!parsed.ok) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", `aliases_json: ${parsed.message}`));
      }
      payload.aliases_json = parsed.value;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_enabled")) {
      const value = normalizeBooleanToInt(payload.is_enabled);
      if (value === null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "is_enabled must be a boolean"));
      }
      payload.is_enabled = value;
    }
    payload.updated_at = new Date().toISOString();

    return withConstraintGuard(reply, () => {
      updateRowById(db, "emoticons", emoticonId, payload);
      const row = parseJsonColumns(getRowById(db, "emoticons", emoticonId), ["aliases_json"]);
      return reply.send(ok(row));
    });
  });

  app.get("/internal/emoticons", async () => {
    const rows = db.prepare("SELECT * FROM emoticons ORDER BY id ASC").all();
    return ok({
      emoticons: rows.map((row) => parseJsonColumns(row, ["aliases_json"])),
    });
  });

  app.post("/internal/content-policies", async (request, reply) => {
    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "scope_type",
      "scope_id",
      "min_length",
      "max_length",
      "max_emoticons",
      "allowed_markup_json",
      "banned_topics_json",
      "style_prompt",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }
    if (typeof body.scope_type !== "string" || !body.scope_type) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "scope_type is required"));
    }
    const allowedScopeTypes = new Set(["global", "board", "persona"]);
    if (!allowedScopeTypes.has(body.scope_type)) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "scope_type must be global|board|persona"));
    }

    const payload = pickKnownFields(body, allowedFields);
    payload.scope_type = body.scope_type;

    if (Object.prototype.hasOwnProperty.call(payload, "scope_id")) {
      const value = normalizeNullableInteger(payload.scope_id);
      if (value === null && payload.scope_id !== null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "scope_id must be an integer or null"));
      }
      if (value !== null && value < 1) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "scope_id must be positive"));
      }
      payload.scope_id = value;
    }
    for (const field of ["min_length", "max_length", "max_emoticons"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeInteger(payload[field]);
        if (value === null) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be an integer`));
        }
        payload[field] = value;
      }
    }
    for (const [field, type] of [
      ["allowed_markup_json", "array"],
      ["banned_topics_json", "array"],
    ]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const parsed = normalizeJsonInput(payload[field], type);
        if (!parsed.ok) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field}: ${parsed.message}`));
        }
        payload[field] = parsed.value;
      }
    }

    return withConstraintGuard(reply, () => {
      const id = insertRow(db, "content_policies", payload);
      const row = parseJsonColumns(getRowById(db, "content_policies", id), [
        "allowed_markup_json",
        "banned_topics_json",
      ]);
      return reply.code(201).send(ok(row));
    });
  });

  app.patch("/internal/content-policies/:id", async (request, reply) => {
    const policyId = parseId(request.params.id);
    if (!policyId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid content policy id"));
    }
    if (!getRowById(db, "content_policies", policyId)) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Content policy not found"));
    }

    const body = getObjectBody(request, reply);
    if (!body) {
      return;
    }
    const allowedFields = new Set([
      "scope_type",
      "scope_id",
      "min_length",
      "max_length",
      "max_emoticons",
      "allowed_markup_json",
      "banned_topics_json",
      "style_prompt",
    ]);
    if (rejectUnknownBodyFields(body, allowedFields, reply)) {
      return;
    }

    const payload = pickKnownFields(body, allowedFields);
    if (Object.prototype.hasOwnProperty.call(payload, "scope_type")) {
      const allowedScopeTypes = new Set(["global", "board", "persona"]);
      if (!allowedScopeTypes.has(payload.scope_type)) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "scope_type must be global|board|persona"));
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "scope_id")) {
      const value = normalizeNullableInteger(payload.scope_id);
      if (value === null && payload.scope_id !== null) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "scope_id must be an integer or null"));
      }
      if (value !== null && value < 1) {
        return reply.code(400).send(fail("INVALID_ARGUMENT", "scope_id must be positive"));
      }
      payload.scope_id = value;
    }
    for (const field of ["min_length", "max_length", "max_emoticons"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = normalizeInteger(payload[field]);
        if (value === null) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field} must be an integer`));
        }
        payload[field] = value;
      }
    }
    for (const [field, type] of [
      ["allowed_markup_json", "array"],
      ["banned_topics_json", "array"],
    ]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const parsed = normalizeJsonInput(payload[field], type);
        if (!parsed.ok) {
          return reply.code(400).send(fail("INVALID_ARGUMENT", `${field}: ${parsed.message}`));
        }
        payload[field] = parsed.value;
      }
    }
    payload.updated_at = new Date().toISOString();

    return withConstraintGuard(reply, () => {
      updateRowById(db, "content_policies", policyId, payload);
      const row = parseJsonColumns(getRowById(db, "content_policies", policyId), [
        "allowed_markup_json",
        "banned_topics_json",
      ]);
      return reply.send(ok(row));
    });
  });

  app.get("/internal/content-policies", async () => {
    const rows = db.prepare("SELECT * FROM content_policies ORDER BY id ASC").all();
    return ok({
      content_policies: rows.map((row) => parseJsonColumns(row, ["allowed_markup_json", "banned_topics_json"])),
    });
  });

  app.post("/internal/threads/:id/hide", async (request, reply) => {
    const threadId = parseId(request.params.id);
    if (!threadId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid thread id"));
    }
    const changes = updateRowById(db, "threads", threadId, {
      status: "hidden",
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Thread not found"));
    }
    return reply.send(ok(getRowById(db, "threads", threadId)));
  });

  app.post("/internal/threads/:id/archive", async (request, reply) => {
    const threadId = parseId(request.params.id);
    if (!threadId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid thread id"));
    }
    const changes = updateRowById(db, "threads", threadId, {
      status: "archived",
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Thread not found"));
    }
    return reply.send(ok(getRowById(db, "threads", threadId)));
  });

  app.post("/internal/posts/:id/hide", async (request, reply) => {
    const postId = parseId(request.params.id);
    if (!postId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid post id"));
    }
    const changes = updateRowById(db, "posts", postId, {
      status: "hidden",
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Post not found"));
    }
    return reply.send(ok(getRowById(db, "posts", postId)));
  });

  app.post("/internal/posts/:id/archive", async (request, reply) => {
    const postId = parseId(request.params.id);
    if (!postId) {
      return reply.code(400).send(fail("INVALID_ARGUMENT", "Invalid post id"));
    }
    const changes = updateRowById(db, "posts", postId, {
      status: "archived",
      updated_at: new Date().toISOString(),
    });
    if (changes === 0) {
      return reply.code(404).send(fail("RESOURCE_NOT_FOUND", "Post not found"));
    }
    return reply.send(ok(getRowById(db, "posts", postId)));
  });

  app.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send(fail("RESOURCE_NOT_FOUND", `Route not found: ${request.method} ${request.url}`));
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    return reply.code(500).send(fail("INTERNAL_ERROR", "Internal server error"));
  });

  return app;
}

module.exports = {
  buildServer,
};
