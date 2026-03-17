const Fastify = require("fastify");
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

function buildServer() {
  const app = Fastify({
    logger: true,
  });
  const db = getDb();

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
