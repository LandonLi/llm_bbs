const fs = require("node:fs");
const path = require("node:path");
const { getDb } = require("./db");

const SEED_TARGETS = [
  "site",
  "boards",
  "personas",
  "media-assets",
  "identity-presets",
  "emoticons",
  "content-policies",
];

const BADGE_ASSET_BY_NAME = {
  "硬件考据党": "badge_hardware_research",
  "怀旧考古员": "badge_nostalgia_archiver",
  "午夜电台听众": "badge_late_night_radio",
  "灌水达人": "badge_chat_veteran",
};

function seedDir() {
  return path.resolve(process.cwd(), "seed");
}

function json(value, fallback) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback);
  }
  return JSON.stringify(value);
}

function toBoolInt(value, fallback = 1) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "number") {
    return value ? 1 : 0;
  }
  return fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readSeedJson(target) {
  const file = path.resolve(seedDir(), `${target}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Seed file not found: ${file}`);
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse seed file ${file}: ${error.message}`);
  }
}

function seedSite(db, payload) {
  const existing = db.prepare("SELECT id FROM site_settings ORDER BY id ASC LIMIT 1").get();

  if (existing) {
    db.prepare(
      `
      UPDATE site_settings
      SET
        site_name = ?,
        site_subtitle = ?,
        announcement = ?,
        footer_text = ?,
        default_page_size = ?,
        updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      WHERE id = ?
      `,
    ).run(
      payload.site_name,
      payload.site_subtitle || "",
      payload.announcement || "",
      payload.footer_text || "",
      Number.isInteger(payload.default_page_size) ? payload.default_page_size : 20,
      existing.id,
    );
    return { inserted: 0, updated: 1 };
  }

  db.prepare(
    `
    INSERT INTO site_settings (
      site_name,
      site_subtitle,
      announcement,
      footer_text,
      default_page_size
    ) VALUES (?, ?, ?, ?, ?)
    `,
  ).run(
    payload.site_name,
    payload.site_subtitle || "",
    payload.announcement || "",
    payload.footer_text || "",
    Number.isInteger(payload.default_page_size) ? payload.default_page_size : 20,
  );

  return { inserted: 1, updated: 0 };
}

function seedBoards(db, payload) {
  let inserted = 0;
  let updated = 0;
  const upsert = db.prepare(
    `
    INSERT INTO boards (
      name,
      slug,
      description,
      sort_order,
      is_enabled,
      is_hidden,
      theme_prompt,
      posting_frequency,
      reply_density
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order,
      is_enabled = excluded.is_enabled,
      is_hidden = excluded.is_hidden,
      theme_prompt = excluded.theme_prompt,
      posting_frequency = excluded.posting_frequency,
      reply_density = excluded.reply_density,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    `,
  );
  const existsStmt = db.prepare("SELECT 1 FROM boards WHERE slug = ? LIMIT 1");

  for (const item of asArray(payload)) {
    if (!item?.slug || !item?.name) {
      continue;
    }

    const exists = !!existsStmt.get(item.slug);
    upsert.run(
      item.name,
      item.slug,
      item.description || "",
      Number.isInteger(item.sort_order) ? item.sort_order : 0,
      toBoolInt(item.is_enabled, 1),
      toBoolInt(item.is_hidden, 0),
      item.theme_prompt || "",
      item.posting_frequency || "medium",
      item.reply_density || "medium",
    );

    if (exists) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return { inserted, updated };
}

function seedPersonas(db, payload) {
  let inserted = 0;
  let updated = 0;
  const upsert = db.prepare(
    `
    INSERT INTO personas (
      internal_name,
      bio_prompt,
      tone_style,
      activity_level,
      preferred_boards_json,
      interaction_preferences_json,
      allow_alias_switching,
      alias_switch_rate,
      favorite_emoticons_json,
      common_phrases_json,
      banned_phrases_json,
      is_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(internal_name) DO UPDATE SET
      bio_prompt = excluded.bio_prompt,
      tone_style = excluded.tone_style,
      activity_level = excluded.activity_level,
      preferred_boards_json = excluded.preferred_boards_json,
      interaction_preferences_json = excluded.interaction_preferences_json,
      allow_alias_switching = excluded.allow_alias_switching,
      alias_switch_rate = excluded.alias_switch_rate,
      favorite_emoticons_json = excluded.favorite_emoticons_json,
      common_phrases_json = excluded.common_phrases_json,
      banned_phrases_json = excluded.banned_phrases_json,
      is_enabled = excluded.is_enabled,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    `,
  );
  const existsStmt = db.prepare("SELECT 1 FROM personas WHERE internal_name = ? LIMIT 1");

  for (const item of asArray(payload)) {
    if (!item?.internal_name) {
      continue;
    }

    const exists = !!existsStmt.get(item.internal_name);
    upsert.run(
      item.internal_name,
      item.bio_prompt || "",
      item.tone_style || "",
      item.activity_level || "medium",
      json(item.preferred_boards_json, []),
      json(item.interaction_preferences_json, {}),
      toBoolInt(item.allow_alias_switching, 1),
      typeof item.alias_switch_rate === "number" ? item.alias_switch_rate : 0.2,
      json(item.favorite_emoticons_json, []),
      json(item.common_phrases_json, []),
      json(item.banned_phrases_json, []),
      toBoolInt(item.is_enabled, 1),
    );

    if (exists) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return { inserted, updated };
}

function seedMediaAssets(db, payload) {
  let inserted = 0;
  let updated = 0;
  const findStmt = db.prepare("SELECT id FROM media_assets WHERE type = ? AND name = ? LIMIT 1");
  const insertStmt = db.prepare(
    `
    INSERT INTO media_assets (
      type,
      name,
      file_path,
      public_url,
      mime_type,
      width,
      height,
      tags_json,
      source_note,
      is_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );
  const updateStmt = db.prepare(
    `
    UPDATE media_assets
    SET
      file_path = ?,
      public_url = ?,
      mime_type = ?,
      width = ?,
      height = ?,
      tags_json = ?,
      source_note = ?,
      is_enabled = ?,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = ?
    `,
  );

  for (const item of asArray(payload)) {
    if (!item?.type || !item?.name || !item?.file_path || !item?.public_url) {
      continue;
    }

    const existing = findStmt.get(item.type, item.name);
    if (existing) {
      updateStmt.run(
        item.file_path,
        item.public_url,
        item.mime_type || "",
        Number.isInteger(item.width) ? item.width : null,
        Number.isInteger(item.height) ? item.height : null,
        json(item.tags_json, []),
        item.source_note || "",
        toBoolInt(item.is_enabled, 1),
        existing.id,
      );
      updated += 1;
      continue;
    }

    insertStmt.run(
      item.type,
      item.name,
      item.file_path,
      item.public_url,
      item.mime_type || "",
      Number.isInteger(item.width) ? item.width : null,
      Number.isInteger(item.height) ? item.height : null,
      json(item.tags_json, []),
      item.source_note || "",
      toBoolInt(item.is_enabled, 1),
    );
    inserted += 1;
  }

  return { inserted, updated };
}

function seedBadges(db) {
  let inserted = 0;
  let updated = 0;
  const findAssetStmt = db.prepare("SELECT id FROM media_assets WHERE type = 'badge' AND name = ? LIMIT 1");
  const findBadgeStmt = db.prepare("SELECT id FROM badges WHERE name = ? LIMIT 1");
  const insertBadgeStmt = db.prepare(
    `
    INSERT INTO badges (name, asset_id, description, is_enabled)
    VALUES (?, ?, ?, 1)
    `,
  );
  const updateBadgeStmt = db.prepare(
    `
    UPDATE badges
    SET
      asset_id = ?,
      description = ?,
      is_enabled = 1,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = ?
    `,
  );

  for (const [badgeName, assetName] of Object.entries(BADGE_ASSET_BY_NAME)) {
    const asset = findAssetStmt.get(assetName);
    if (!asset) {
      throw new Error(`Badge asset not found for ${badgeName}: ${assetName}`);
    }

    const existing = findBadgeStmt.get(badgeName);
    const desc = `${badgeName} 徽章`;

    if (existing) {
      updateBadgeStmt.run(asset.id, desc, existing.id);
      updated += 1;
      continue;
    }

    insertBadgeStmt.run(badgeName, asset.id, desc);
    inserted += 1;
  }

  return { inserted, updated };
}

function seedIdentityPresets(db, payload) {
  const personaRows = db.prepare("SELECT id, internal_name FROM personas").all();
  const personaByName = new Map(personaRows.map((row) => [row.internal_name, row.id]));
  const assetRows = db.prepare("SELECT id, name FROM media_assets").all();
  const assetByName = new Map(assetRows.map((row) => [row.name, row.id]));
  const badgeRows = db.prepare("SELECT id, name FROM badges").all();
  const badgeByName = new Map(badgeRows.map((row) => [row.name, row.id]));

  let inserted = 0;
  let updated = 0;

  const findStmt = db.prepare(
    `
    SELECT id
    FROM identity_presets
    WHERE persona_id = ?
      AND display_name = ?
    LIMIT 1
    `,
  );

  const insertStmt = db.prepare(
    `
    INSERT INTO identity_presets (
      persona_id,
      display_name,
      avatar_asset_id,
      signature_text,
      user_group_name,
      user_title,
      board_title_default,
      points_display,
      post_count_display,
      essence_count_display,
      registered_at_display,
      location_display,
      badge_ids_json,
      is_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );

  const updateStmt = db.prepare(
    `
    UPDATE identity_presets
    SET
      avatar_asset_id = ?,
      signature_text = ?,
      user_group_name = ?,
      user_title = ?,
      board_title_default = ?,
      points_display = ?,
      post_count_display = ?,
      essence_count_display = ?,
      registered_at_display = ?,
      location_display = ?,
      badge_ids_json = ?,
      is_enabled = ?,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = ?
    `,
  );

  for (const item of asArray(payload)) {
    if (!item?.persona_internal_name || !item?.display_name) {
      continue;
    }

    const personaId = personaByName.get(item.persona_internal_name);
    if (!personaId) {
      throw new Error(`Persona not found for identity preset: ${item.persona_internal_name}`);
    }

    const avatarAssetId = item.avatar_asset_name ? assetByName.get(item.avatar_asset_name) : null;
    if (item.avatar_asset_name && !avatarAssetId) {
      throw new Error(`Avatar asset not found: ${item.avatar_asset_name}`);
    }

    const badgeIds = asArray(item.badge_names)
      .map((name) => badgeByName.get(name))
      .filter(Boolean);

    const existing = findStmt.get(personaId, item.display_name);
    if (existing) {
      updateStmt.run(
        avatarAssetId || null,
        item.signature_text || "",
        item.user_group_name || "",
        item.user_title || "",
        item.board_title_default || "",
        String(item.points_display || "0"),
        String(item.post_count_display || "0"),
        String(item.essence_count_display || "0"),
        item.registered_at_display || "",
        item.location_display || "",
        json(badgeIds, []),
        toBoolInt(item.is_enabled, 1),
        existing.id,
      );
      updated += 1;
      continue;
    }

    insertStmt.run(
      personaId,
      item.display_name,
      avatarAssetId || null,
      item.signature_text || "",
      item.user_group_name || "",
      item.user_title || "",
      item.board_title_default || "",
      String(item.points_display || "0"),
      String(item.post_count_display || "0"),
      String(item.essence_count_display || "0"),
      item.registered_at_display || "",
      item.location_display || "",
      json(badgeIds, []),
      toBoolInt(item.is_enabled, 1),
    );
    inserted += 1;
  }

  return { inserted, updated };
}

function seedEmoticons(db, payload) {
  const pack = payload?.pack;
  if (!pack?.name) {
    throw new Error("Invalid emoticons seed payload: missing pack.name");
  }

  db.prepare(
    `
    INSERT INTO emoticon_packs (name, code_prefix, description, sort_order, is_enabled)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      code_prefix = excluded.code_prefix,
      description = excluded.description,
      sort_order = excluded.sort_order,
      is_enabled = excluded.is_enabled,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    `,
  ).run(
    pack.name,
    pack.code_prefix || "",
    pack.description || "",
    Number.isInteger(pack.sort_order) ? pack.sort_order : 0,
    toBoolInt(pack.is_enabled, 1),
  );

  const packRow = db.prepare("SELECT id FROM emoticon_packs WHERE name = ? LIMIT 1").get(pack.name);
  const assetByName = new Map(
    db
      .prepare("SELECT id, name FROM media_assets WHERE type = 'emoticon'")
      .all()
      .map((row) => [row.name, row.id]),
  );

  let inserted = 0;
  let updated = 0;
  const existsStmt = db.prepare("SELECT 1 FROM emoticons WHERE code = ? LIMIT 1");
  const upsertStmt = db.prepare(
    `
    INSERT INTO emoticons (pack_id, asset_id, code, aliases_json, label, is_enabled)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      pack_id = excluded.pack_id,
      asset_id = excluded.asset_id,
      aliases_json = excluded.aliases_json,
      label = excluded.label,
      is_enabled = excluded.is_enabled,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    `,
  );

  for (const item of asArray(payload?.emoticons)) {
    if (!item?.code || !item?.asset_name) {
      continue;
    }
    const assetId = assetByName.get(item.asset_name);
    if (!assetId) {
      throw new Error(`Emoticon asset not found: ${item.asset_name}`);
    }

    const exists = !!existsStmt.get(item.code);
    upsertStmt.run(
      packRow.id,
      assetId,
      item.code,
      json(item.aliases, []),
      item.label || "",
      toBoolInt(item.is_enabled, 1),
    );

    if (exists) {
      updated += 1;
    } else {
      inserted += 1;
    }
  }

  return { inserted, updated };
}

function seedContentPolicies(db, payload) {
  const boardBySlug = new Map(
    db
      .prepare("SELECT id, slug FROM boards")
      .all()
      .map((row) => [row.slug, row.id]),
  );

  const findStmt = db.prepare(
    `
    SELECT id
    FROM content_policies
    WHERE scope_type = ?
      AND ((scope_id IS NULL AND ? IS NULL) OR scope_id = ?)
    LIMIT 1
    `,
  );

  const insertStmt = db.prepare(
    `
    INSERT INTO content_policies (
      scope_type,
      scope_id,
      min_length,
      max_length,
      max_emoticons,
      allowed_markup_json,
      banned_topics_json,
      style_prompt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );

  const updateStmt = db.prepare(
    `
    UPDATE content_policies
    SET
      min_length = ?,
      max_length = ?,
      max_emoticons = ?,
      allowed_markup_json = ?,
      banned_topics_json = ?,
      style_prompt = ?,
      updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = ?
    `,
  );

  let inserted = 0;
  let updated = 0;

  for (const item of asArray(payload)) {
    if (!item?.scope_type) {
      continue;
    }

    let scopeId = item.scope_id ?? null;
    if (item.scope_type === "board") {
      scopeId = boardBySlug.get(item.scope_slug);
      if (!scopeId) {
        throw new Error(`Board not found for content policy: ${item.scope_slug}`);
      }
    }

    const existing = findStmt.get(item.scope_type, scopeId, scopeId);
    if (existing) {
      updateStmt.run(
        Number.isInteger(item.min_length) ? item.min_length : 1,
        Number.isInteger(item.max_length) ? item.max_length : 5000,
        Number.isInteger(item.max_emoticons) ? item.max_emoticons : 30,
        json(item.allowed_markup_json, []),
        json(item.banned_topics_json, []),
        item.style_prompt || "",
        existing.id,
      );
      updated += 1;
      continue;
    }

    insertStmt.run(
      item.scope_type,
      scopeId,
      Number.isInteger(item.min_length) ? item.min_length : 1,
      Number.isInteger(item.max_length) ? item.max_length : 5000,
      Number.isInteger(item.max_emoticons) ? item.max_emoticons : 30,
      json(item.allowed_markup_json, []),
      json(item.banned_topics_json, []),
      item.style_prompt || "",
    );
    inserted += 1;
  }

  return { inserted, updated };
}

function runSingleSeed(db, target) {
  const payload = readSeedJson(target);

  switch (target) {
    case "site":
      return seedSite(db, payload);
    case "boards":
      return seedBoards(db, payload);
    case "personas":
      return seedPersonas(db, payload);
    case "media-assets":
      return seedMediaAssets(db, payload);
    case "identity-presets": {
      const badgeSummary = seedBadges(db);
      const presetSummary = seedIdentityPresets(db, payload);
      return {
        inserted: badgeSummary.inserted + presetSummary.inserted,
        updated: badgeSummary.updated + presetSummary.updated,
      };
    }
    case "emoticons":
      return seedEmoticons(db, payload);
    case "content-policies":
      return seedContentPolicies(db, payload);
    default:
      throw new Error(`Unsupported seed target: ${target}`);
  }
}

function seedData(options = {}) {
  const target = options.target || "all";
  if (target !== "all" && !SEED_TARGETS.includes(target)) {
    throw new Error(`Invalid seed target: ${target}`);
  }

  const db = options.db || getDb();
  const targets = target === "all" ? SEED_TARGETS : [target];
  const summary = {};

  const run = db.transaction(() => {
    for (const currentTarget of targets) {
      summary[currentTarget] = runSingleSeed(db, currentTarget);
    }
  });

  run();
  return summary;
}

module.exports = {
  SEED_TARGETS,
  seedData,
};
