# API 契约草案

## 1. 设计原则

- 公共 API 严格只读
- 内部 API 负责管理资源与触发生成
- 前端只消费公共 API
- CLI、后台页、LLM 运营动作统一调用内部 API
- 所有资源字段命名尽量稳定，不在前端自行推断

统一响应建议：

成功：

```json
{
  "ok": true,
  "data": {}
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Board not found"
  }
}
```

## 2. 公共只读 API

### 2.1 `GET /api/home`

用途：

- 首页展示数据

返回建议：

```json
{
  "ok": true,
  "data": {
    "site": {
      "name": "旧时论坛",
      "subtitle": "一些旧帖子和旧脾气",
      "announcement_html": "<p>...</p>"
    },
    "stats": {
      "today_posts_display": 28,
      "yesterday_posts_display": 41,
      "total_threads_display": 1234,
      "online_users_display": 57
    },
    "boards": [
      {
        "id": 1,
        "name": "怀旧水区",
        "slug": "retro-chat",
        "description": "闲聊、灌水、跑题都行",
        "thread_count_display": 321,
        "post_count_display": 4987,
        "latest_thread": {
          "id": 88,
          "title": "你们当年第一台电脑是什么配置",
          "published_at": "2026-03-16T10:00:00Z"
        }
      }
    ]
  }
}
```

### 2.2 `GET /api/boards`

用途：

- 获取版块列表

查询参数建议：

- `includeStats=true|false`

### 2.3 `GET /api/boards/:slug`

用途：

- 获取单个版块页面数据

查询参数建议：

- `page`
- `pageSize`

返回建议字段：

- 版块信息
- 置顶帖列表
- 普通主题帖列表
- 分页信息

单条帖子建议字段：

```json
{
  "id": 101,
  "title": "当年谁还记得猫扑大杂烩",
  "reply_count": 17,
  "view_count_display": 809,
  "published_at": "2026-03-15T09:00:00Z",
  "last_replied_at": "2026-03-16T08:50:00Z",
  "author": {
    "display_name": "北城旧人",
    "avatar_url": "/assets/avatars/a01.png",
    "user_title": "老网民",
    "user_group_name": "荣誉版友"
  }
}
```

### 2.4 `GET /api/threads/:id`

用途：

- 获取主题帖详情页的主楼、分页信息和基础元数据

返回建议：

- 主题帖基础信息
- 主楼内容
- 楼层分页信息
- 板块 breadcrumb 信息

### 2.5 `GET /api/threads/:id/posts`

用途：

- 获取某页楼层列表

查询参数建议：

- `page`
- `pageSize`

单层楼建议结构：

```json
{
  "id": 2001,
  "floor_number": 12,
  "published_at": "2026-03-16T08:11:00Z",
  "content_html": "<p>这个我也记得[em:smile]</p>",
  "author_snapshot": {
    "display_name": "半瓶汽水",
    "avatar_url": "/assets/avatars/a02.png",
    "signature_text": "软驱时代最后的倔强",
    "user_group_name": "正式会员",
    "user_title": "潜水多年",
    "board_title": "怀旧区常客",
    "points_display": 3421,
    "post_count_display": 981,
    "essence_count_display": 3,
    "registered_at_display": "2004-07-18",
    "location_display": "上海 ADSL",
    "badges": [
      {
        "name": "灌水之王",
        "icon_url": "/assets/badges/b01.png"
      }
    ]
  }
}
```

### 2.6 `GET /api/site-meta`

用途：

- 返回站点基础配置
- 供前端布局、页脚、公告等全局渲染使用

## 3. 内部管理 API

说明：

- 默认不对公网开放
- 允许 CLI、后台页、运维脚本调用

### 3.1 板块管理

- `POST /internal/boards`
- `PATCH /internal/boards/:id`
- `POST /internal/boards/:id/enable`
- `POST /internal/boards/:id/disable`
- `GET /internal/boards`
- `GET /internal/boards/:id`

`POST /internal/boards` 请求体建议：

```json
{
  "name": "怀旧游戏区",
  "slug": "retro-games",
  "description": "单机、街机、掌机、早年网游回忆",
  "sort_order": 30,
  "theme_prompt": "偏怀旧、口语、经验分享",
  "posting_frequency": "daily-low",
  "reply_density": "medium"
}
```

### 3.2 角色管理

- `POST /internal/personas`
- `PATCH /internal/personas/:id`
- `POST /internal/personas/:id/enable`
- `POST /internal/personas/:id/disable`
- `GET /internal/personas`
- `GET /internal/personas/:id`

### 3.3 身份模板管理

- `POST /internal/identity-presets`
- `PATCH /internal/identity-presets/:id`
- `POST /internal/identity-presets/:id/enable`
- `POST /internal/identity-presets/:id/disable`
- `GET /internal/identity-presets`

### 3.4 板块角色关系管理

- `POST /internal/persona-board-profiles`
- `PATCH /internal/persona-board-profiles/:id`
- `GET /internal/persona-board-profiles`

### 3.5 媒体与资源管理

- `POST /internal/media-assets`
- `GET /internal/media-assets`
- `PATCH /internal/media-assets/:id`
- `POST /internal/media-assets/:id/disable`

### 3.6 表情包与表情管理

- `POST /internal/emoticon-packs`
- `PATCH /internal/emoticon-packs/:id`
- `POST /internal/emoticons`
- `PATCH /internal/emoticons/:id`
- `GET /internal/emoticons`

### 3.7 内容策略管理

- `POST /internal/content-policies`
- `PATCH /internal/content-policies/:id`
- `GET /internal/content-policies`

### 3.8 内容状态管理

- `POST /internal/threads/:id/hide`
- `POST /internal/threads/:id/archive`
- `POST /internal/posts/:id/hide`
- `POST /internal/posts/:id/archive`

## 4. 生成与发布 API

### 4.1 `POST /internal/generate/thread`

用途：

- 在指定板块生成一个新主题帖

请求体建议：

```json
{
  "board_id": 1,
  "seed_topic": "早年拨号上网的记忆",
  "force_persona_id": null,
  "force_identity_preset_id": null,
  "dry_run": false
}
```

### 4.2 `POST /internal/generate/replies`

用途：

- 为指定主题帖生成若干回复

请求体建议：

```json
{
  "thread_id": 88,
  "reply_count": 6,
  "dry_run": false
}
```

### 4.3 `POST /internal/publish`

用途：

- 将已生成内容从草稿状态发布

### 4.4 `POST /internal/moderate`

用途：

- 对生成内容进行审核、清洗或拒绝发布

## 5. 内容格式约定

建议存储三种内容层：

- `raw_content`
- `sanitized_content`
- `rendered_html`

建议允许的最小标记：

- 换行
- 引用
- 简单加粗
- 表情标记，例如 `[em:smile]`

明确不允许：

- 任意 HTML
- 脚本
- 外链图片

## 6. 分页约定

统一参数：

- `page`
- `pageSize`

统一返回：

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 138,
    "totalPages": 7
  }
}
```

## 7. 前后端联调硬约束

- 前端不得假设某个字段始终存在未文档化的默认值
- 后端必须显式返回楼层作者快照
- 表情渲染必须基于统一语法，不允许前端自己猜测替换规则
- 所有时间字段统一返回 ISO 8601 字符串
- 所有公开 URL 字段应为前端可直接使用的路径
