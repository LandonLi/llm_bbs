const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { after, before, describe, test } = require("node:test");

const backendRoot = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-bbs-backend-test-"));
const databasePath = path.join(tempRoot, "integration.db");
const ADMIN_API_KEY = "test-admin-key";

process.chdir(backendRoot);
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = databasePath;
process.env.ADMIN_API_KEY = ADMIN_API_KEY;

const { buildServer } = require("../src/app/server");
const { getDb, closeDb } = require("../src/lib/db");
const { runMigrations } = require("../src/lib/migrate");
const { seedData } = require("../src/lib/seeder");

let app;
let db;
let sampleThreadId;

function makeAuthorSnapshot(displayName) {
  return JSON.stringify({
    display_name: displayName,
    avatar_url: "/assets/avatars/test.png",
    signature_text: "test signature",
    user_group_name: "正式会员",
    user_title: "老网民",
    board_title: "怀旧区常客",
    points_display: "1024",
    post_count_display: "512",
    essence_count_display: "9",
    registered_at_display: "2005-06-01",
    location_display: "上海",
    badges: [{ name: "灌水达人", icon_url: "/assets/badges/test.png" }],
  });
}

function withAdminHeaders(headers = {}) {
  return {
    ...headers,
    "x-admin-api-key": ADMIN_API_KEY,
  };
}

function tableCount(tableName) {
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get();
  return row.total;
}

before(async () => {
  runMigrations();
  seedData({ target: "all" });
  db = getDb();

  const board = db.prepare("SELECT id FROM boards WHERE is_enabled = 1 ORDER BY id ASC LIMIT 1").get();
  const persona = db.prepare("SELECT id FROM personas WHERE is_enabled = 1 ORDER BY id ASC LIMIT 1").get();
  const identityPreset = db.prepare("SELECT id FROM identity_presets ORDER BY id ASC LIMIT 1").get();
  assert.ok(board, "Expected at least one seeded board");
  assert.ok(persona, "Expected at least one seeded persona");

  const now = new Date().toISOString();
  const threadInsert = db
    .prepare(
      `
      INSERT INTO threads (
        board_id,
        persona_id,
        identity_preset_id,
        title,
        raw_content,
        sanitized_content,
        rendered_html,
        reply_count,
        view_count_display,
        is_pinned,
        status,
        published_at,
        last_replied_at,
        snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      board.id,
      persona.id,
      identityPreset ? identityPreset.id : null,
      "测试主题帖",
      "raw-content",
      "sanitized-content",
      "<p>测试主题帖内容</p>",
      1,
      "88",
      0,
      "published",
      now,
      now,
      makeAuthorSnapshot("测试楼主"),
    );
  sampleThreadId = Number(threadInsert.lastInsertRowid);

  db.prepare(
    `
    INSERT INTO posts (
      thread_id,
      floor_number,
      persona_id,
      identity_preset_id,
      reply_to_post_id,
      raw_content,
      sanitized_content,
      rendered_html,
      status,
      published_at,
      snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    sampleThreadId,
    2,
    persona.id,
    identityPreset ? identityPreset.id : null,
    null,
    "raw-reply",
    "sanitized-reply",
    "<p>测试回帖内容</p>",
    "published",
    now,
    makeAuthorSnapshot("测试回帖用户"),
  );

  app = buildServer();
  await app.ready();
});

after(async () => {
  if (app) {
    await app.close();
  }
  closeDb();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("#2 Backend foundation", () => {
  test("配置读取与校验：无效 env 报错", () => {
    const result = spawnSync(
      process.execPath,
      ["-e", 'process.env.PORT="not-a-number";require("./src/app/config")'],
      {
        cwd: backendRoot,
        encoding: "utf8",
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid environment variables/);
  });

  test("迁移可重复执行（幂等）", () => {
    runMigrations();
    const afterFirst = tableCount("_migrations");
    runMigrations();
    const afterSecond = tableCount("_migrations");
    assert.equal(afterFirst, afterSecond);
    assert.ok(afterSecond >= 1);
  });

  test("/health 返回 200 与约定 JSON", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      ok: true,
      data: { status: "up" },
    });
  });
});

describe("#5 公共只读 API", () => {
  test("关键只读端点成功响应", async () => {
    const home = await app.inject({ method: "GET", url: "/api/home" });
    assert.equal(home.statusCode, 200);
    assert.equal(home.json().ok, true);

    const boards = await app.inject({ method: "GET", url: "/api/boards?includeStats=true" });
    assert.equal(boards.statusCode, 200);
    assert.equal(boards.json().ok, true);
    assert.ok(Array.isArray(boards.json().data.boards));

    const boardSlug = boards.json().data.boards[0].slug;
    const boardDetail = await app.inject({ method: "GET", url: `/api/boards/${boardSlug}` });
    assert.equal(boardDetail.statusCode, 200);
    assert.equal(boardDetail.json().ok, true);

    const thread = await app.inject({ method: "GET", url: `/api/threads/${sampleThreadId}` });
    assert.equal(thread.statusCode, 200);
    assert.equal(thread.json().ok, true);

    const posts = await app.inject({ method: "GET", url: `/api/threads/${sampleThreadId}/posts` });
    assert.equal(posts.statusCode, 200);
    assert.equal(posts.json().ok, true);
  });

  test("参数校验与错误码稳定", async () => {
    const invalidThreadId = await app.inject({
      method: "GET",
      url: "/api/threads/not-a-number",
    });
    assert.equal(invalidThreadId.statusCode, 400);
    assert.equal(invalidThreadId.json().error.code, "INVALID_ARGUMENT");

    const missingBoard = await app.inject({
      method: "GET",
      url: "/api/boards/not-found-board",
    });
    assert.equal(missingBoard.statusCode, 404);
    assert.equal(missingBoard.json().error.code, "RESOURCE_NOT_FOUND");
  });
});

describe("#6 内部管理 API", () => {
  test("管理端鉴权通过/拒绝路径可测", async () => {
    const rejected = await app.inject({
      method: "GET",
      url: "/internal/boards",
    });
    assert.equal(rejected.statusCode, 401);
    assert.equal(rejected.json().error.code, "UNAUTHORIZED");

    const accepted = await app.inject({
      method: "GET",
      url: "/internal/boards",
      headers: withAdminHeaders(),
    });
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.json().ok, true);
  });

  test("核心写操作覆盖成功与失败分支", async () => {
    const createBoard = await app.inject({
      method: "POST",
      url: "/internal/boards",
      headers: withAdminHeaders({ "content-type": "application/json" }),
      payload: {
        name: "测试版块",
        slug: "test-board",
        sort_order: 99,
      },
    });
    assert.equal(createBoard.statusCode, 201);
    assert.equal(createBoard.json().ok, true);

    const patchMissing = await app.inject({
      method: "PATCH",
      url: "/internal/boards/999999",
      headers: withAdminHeaders({ "content-type": "application/json" }),
      payload: { name: "will-not-work" },
    });
    assert.equal(patchMissing.statusCode, 404);
    assert.equal(patchMissing.json().error.code, "RESOURCE_NOT_FOUND");
  });
});

describe("#7 种子与 CLI", () => {
  test("种子数据导入可重复执行", () => {
    const beforeCounts = {
      boards: tableCount("boards"),
      personas: tableCount("personas"),
      media_assets: tableCount("media_assets"),
      identity_presets: tableCount("identity_presets"),
      emoticons: tableCount("emoticons"),
      content_policies: tableCount("content_policies"),
    };

    seedData({ target: "all" });

    const afterCounts = {
      boards: tableCount("boards"),
      personas: tableCount("personas"),
      media_assets: tableCount("media_assets"),
      identity_presets: tableCount("identity_presets"),
      emoticons: tableCount("emoticons"),
      content_policies: tableCount("content_policies"),
    };

    assert.deepEqual(afterCounts, beforeCounts);
  });

  test("CLI 基本命令可运行并返回预期退出码", () => {
    const cliDbPath = path.join(tempRoot, "cli.db");
    const cliEnv = {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_PATH: cliDbPath,
      ADMIN_API_KEY,
    };

    const initResult = spawnSync(process.execPath, ["src/cli/index.js", "db:init"], {
      cwd: backendRoot,
      env: cliEnv,
      encoding: "utf8",
    });
    assert.equal(initResult.status, 0);

    const seedResult = spawnSync(process.execPath, ["src/cli/index.js", "seed", "--file", "boards"], {
      cwd: backendRoot,
      env: cliEnv,
      encoding: "utf8",
    });
    assert.equal(seedResult.status, 0);

    const invalidSeedTarget = spawnSync(
      process.execPath,
      ["src/cli/index.js", "seed", "--file", "invalid-target"],
      {
        cwd: backendRoot,
        env: cliEnv,
        encoding: "utf8",
      },
    );
    assert.equal(invalidSeedTarget.status, 1);
  });
});
