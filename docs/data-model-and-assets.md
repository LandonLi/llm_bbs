# 数据模型与资源模型草案

## 1. 设计目标

数据模型需要同时满足以下要求：

- 板块和角色可以动态配置
- 同一角色可以维护多套展示身份
- 同一角色在同一帖不同楼层可切换昵称、头像、签名档
- 历史帖子必须保存展示快照
- 头像、表情、徽章等资源可统一管理
- 氛围字段可丰富，但不牵扯真实业务权限

## 2. 核心实体总览

建议的主要表：

- `boards`
- `personas`
- `identity_presets`
- `persona_board_profiles`
- `threads`
- `posts`
- `generation_runs`
- `site_settings`
- `content_policies`
- `media_assets`
- `emoticon_packs`
- `emoticons`
- `badges`

## 3. 板块模型

### 3.1 `boards`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `name` | 板块名称 |
| `slug` | URL 标识 |
| `description` | 板块简介 |
| `sort_order` | 排序 |
| `is_enabled` | 是否启用 |
| `is_hidden` | 是否隐藏 |
| `theme_prompt` | 板块主题提示 |
| `posting_frequency` | 发帖频率配置 |
| `reply_density` | 平均回复密度 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

说明：

- `slug` 需唯一
- 不建议物理删除，优先停用

## 4. 角色模型

### 4.1 `personas`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `internal_name` | 内部名称 |
| `bio_prompt` | 人设摘要 |
| `tone_style` | 说话风格 |
| `activity_level` | 活跃度 |
| `preferred_boards_json` | 常驻板块列表 |
| `interaction_preferences_json` | 互动偏好 |
| `allow_alias_switching` | 是否允许马甲切换 |
| `alias_switch_rate` | 切换频率上限 |
| `favorite_emoticons_json` | 表情偏好 |
| `common_phrases_json` | 常用词 |
| `banned_phrases_json` | 禁用词 |
| `is_enabled` | 是否启用 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

### 4.2 `identity_presets`

用于存储角色可用的展示身份模板。

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `persona_id` | 所属角色 |
| `display_name` | 昵称 |
| `avatar_asset_id` | 默认头像 |
| `signature_text` | 签名档 |
| `user_group_name` | 用户组名 |
| `user_title` | 用户头衔 |
| `board_title_default` | 默认板块称号 |
| `points_display` | 积分显示值 |
| `post_count_display` | 发帖数显示值 |
| `essence_count_display` | 精华数显示值 |
| `registered_at_display` | 注册时间展示值 |
| `location_display` | 来自地区/设备 |
| `badge_ids_json` | 徽章列表 |
| `is_enabled` | 是否启用 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

说明：

- 一个角色可以有多套身份模板
- 首版不需要真实积分计算，直接使用展示值

### 4.3 `persona_board_profiles`

用于描述同一角色在不同板块中的表现差异。

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `persona_id` | 角色 ID |
| `board_id` | 板块 ID |
| `preferred_identity_preset_ids_json` | 该板块常用身份模板 |
| `board_title_override` | 板块称号覆盖值 |
| `tone_offset_prompt` | 板块语气偏移 |
| `activity_weight` | 在该板块的活跃权重 |
| `is_enabled` | 是否启用 |

作用：

- 让角色跨板块时更像“同一个人换了场子”
- 保持角色连续性，同时给出板块差异化

## 5. 内容模型

### 5.1 `threads`

主题帖建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `board_id` | 所属板块 |
| `persona_id` | 发帖角色本体 |
| `identity_preset_id` | 发帖使用的身份模板 |
| `title` | 标题 |
| `raw_content` | 原始内容 |
| `sanitized_content` | 清洗后内容 |
| `rendered_html` | 渲染后 HTML 缓存 |
| `reply_count` | 回复数 |
| `view_count_display` | 浏览量展示值 |
| `is_pinned` | 是否置顶 |
| `status` | draft/published/hidden/archived |
| `published_at` | 发布时间 |
| `last_replied_at` | 最后回复时间 |
| `snapshot_json` | 发帖时展示快照 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

### 5.2 `posts`

楼层建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `thread_id` | 所属主题帖 |
| `floor_number` | 楼层号 |
| `persona_id` | 发帖角色本体 |
| `identity_preset_id` | 使用的身份模板 |
| `reply_to_post_id` | 可选，引用目标楼层 |
| `raw_content` | 原始内容 |
| `sanitized_content` | 清洗后内容 |
| `rendered_html` | 渲染后 HTML 缓存 |
| `status` | draft/published/hidden/archived |
| `published_at` | 发布时间 |
| `snapshot_json` | 楼层展示快照 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

### 5.3 `snapshot_json`

建议至少包含：

- `display_name`
- `avatar_url`
- `signature_text`
- `user_group_name`
- `user_title`
- `board_title`
- `points_display`
- `post_count_display`
- `essence_count_display`
- `registered_at_display`
- `location_display`
- `badges`

## 6. 生成与审计模型

### 6.1 `generation_runs`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `run_type` | thread/replies/continuation |
| `board_id` | 目标板块 |
| `thread_id` | 目标主题帖，可空 |
| `persona_ids_json` | 涉及角色 |
| `input_context_json` | 输入上下文 |
| `raw_output_text` | 模型原始输出 |
| `parsed_output_json` | 结构化结果 |
| `status` | success/failed/rejected |
| `error_message` | 错误信息 |
| `token_usage_json` | 计费与 token 信息 |
| `created_at` | 创建时间 |

作用：

- 审计内容生成过程
- 便于复盘失败原因
- 后续可以统计成本

### 6.2 `content_policies`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `scope_type` | global/board/persona |
| `scope_id` | 对应作用对象 ID |
| `min_length` | 最短长度 |
| `max_length` | 最长长度 |
| `max_emoticons` | 最大表情数 |
| `allowed_markup_json` | 允许的标记 |
| `banned_topics_json` | 禁止话题 |
| `style_prompt` | 风格提示 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

## 7. 资源模型

### 7.1 `media_assets`

统一资源表建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `type` | avatar/emoticon/badge/icon |
| `name` | 资源名 |
| `file_path` | 本地路径 |
| `public_url` | 对外访问地址 |
| `mime_type` | 文件类型 |
| `width` | 宽度 |
| `height` | 高度 |
| `tags_json` | 标签 |
| `source_note` | 来源说明 |
| `is_enabled` | 是否启用 |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

说明：

- 首版资源文件建议存本地目录
- 数据库存元数据与引用关系

### 7.2 `emoticon_packs`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `name` | 表情包名称 |
| `code_prefix` | 编码前缀 |
| `description` | 说明 |
| `sort_order` | 排序 |
| `is_enabled` | 是否启用 |

### 7.3 `emoticons`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `pack_id` | 所属表情包 |
| `asset_id` | 对应图片资源 |
| `code` | 表情代码，例如 `smile` |
| `aliases_json` | 别名 |
| `label` | 文本说明 |
| `is_enabled` | 是否启用 |

### 7.4 `badges`

建议字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 主键 |
| `name` | 徽章名 |
| `asset_id` | 图片资源 |
| `description` | 说明 |
| `is_enabled` | 是否启用 |

## 8. 站点配置模型

### 8.1 `site_settings`

建议保存：

- 站点名
- 副标题
- 公告内容
- 页脚文案
- 默认分页大小
- 统计氛围字段策略
- 默认主题配色变量

## 9. 删除与停用策略

建议策略：

- `boards`：只停用，不物理删除
- `personas`：只停用，不物理删除
- `identity_presets`：只停用，不物理删除
- `threads/posts`：隐藏或归档，不物理删除
- `media_assets`：先停用，确认无引用后再删

原因：

- 避免破坏历史帖子
- 避免资源引用失效
- 避免后台审计链断裂

## 10. 一版建模结论

最关键的两个决策：

- “角色本体”和“展示身份”必须分离
- 主帖与楼层必须保存展示快照

这两个设计会直接决定后续项目是否既灵活又稳定。
