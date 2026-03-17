function parseJson(value, fallback) {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringOrDefault(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeBadgeList(badges) {
  if (!Array.isArray(badges)) {
    return [];
  }

  return badges
    .map((badge) => ({
      name: stringOrDefault(badge?.name),
      icon_url: stringOrDefault(badge?.icon_url),
    }))
    .filter((badge) => badge.name || badge.icon_url);
}

function buildSnapshotFromRecords(options) {
  const persona = options?.persona || {};
  const identityPreset = options?.identityPreset || {};
  const boardProfile = options?.boardProfile || {};
  const mediaAssetsById = options?.mediaAssetsById || new Map();
  const badgesById = options?.badgesById || new Map();

  const badgeIds = Array.isArray(identityPreset.badge_ids_json)
    ? identityPreset.badge_ids_json
    : parseJson(identityPreset.badge_ids_json, []);

  const badges = badgeIds
    .map((id) => badgesById.get(id))
    .filter(Boolean)
    .map((badge) => {
      const badgeAsset = badge.asset_id ? mediaAssetsById.get(badge.asset_id) : null;
      return {
        name: stringOrDefault(badge.name),
        icon_url: stringOrDefault(badgeAsset?.public_url),
      };
    });

  const avatarAsset = identityPreset.avatar_asset_id
    ? mediaAssetsById.get(identityPreset.avatar_asset_id)
    : null;

  const boardTitle =
    stringOrDefault(options?.boardTitleOverride) ||
    stringOrDefault(boardProfile.board_title_override) ||
    stringOrDefault(identityPreset.board_title_default);

  return {
    display_name: stringOrDefault(identityPreset.display_name, stringOrDefault(persona.internal_name)),
    avatar_url: stringOrDefault(avatarAsset?.public_url),
    signature_text: stringOrDefault(identityPreset.signature_text),
    user_group_name: stringOrDefault(identityPreset.user_group_name),
    user_title: stringOrDefault(identityPreset.user_title),
    board_title: boardTitle,
    points_display: String(identityPreset.points_display ?? "0"),
    post_count_display: String(identityPreset.post_count_display ?? "0"),
    essence_count_display: String(identityPreset.essence_count_display ?? "0"),
    registered_at_display: stringOrDefault(identityPreset.registered_at_display),
    location_display: stringOrDefault(identityPreset.location_display),
    badges: normalizeBadgeList(badges),
  };
}

function buildSnapshotJson(options) {
  return JSON.stringify(buildSnapshotFromRecords(options));
}

module.exports = {
  buildSnapshotFromRecords,
  buildSnapshotJson,
};
