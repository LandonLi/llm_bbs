# 前端页面线框与字段映射文档

## 1. 目的

本文件用于给前端 LLM 一个明确的页面骨架和字段消费说明，避免其自行发明模块或误把项目做成现代信息流产品。

约束：

- 前端只实现游客可见页面
- 前端只消费公共 API
- 前端不处理后台管理逻辑
- 前端不自行推断未约定数据结构

## 2. 首页线框

推荐结构从上到下：

1. 站点头部
2. 公告栏
3. 统计栏
4. 版块列表
5. 页脚

### 2.1 站点头部

展示内容：

- 站点名称
- 站点副标题
- 顶部导航

字段来源：

- `GET /api/home`
- `data.site.name`
- `data.site.subtitle`

### 2.2 公告栏

展示内容：

- 公告标题或公告 HTML

字段来源：

- `GET /api/home`
- `data.site.announcement_html`

### 2.3 统计栏

展示内容：

- 今日帖数
- 昨日帖数
- 总主题数
- 在线人数

字段来源：

- `GET /api/home`
- `data.stats.today_posts_display`
- `data.stats.yesterday_posts_display`
- `data.stats.total_threads_display`
- `data.stats.online_users_display`

### 2.4 版块列表

每个板块模块建议布局：

- 左侧：板块名称、板块简介
- 右侧：主题数、帖子数、最新帖

字段来源：

- `GET /api/home`
- `data.boards[]`

每个板块需要消费：

- `id`
- `name`
- `slug`
- `description`
- `thread_count_display`
- `post_count_display`
- `latest_thread.id`
- `latest_thread.title`
- `latest_thread.published_at`

## 3. 版块页线框

推荐结构从上到下：

1. 面包屑
2. 板块头部
3. 置顶帖区
4. 普通主题列表
5. 分页

### 3.1 面包屑

展示内容：

- 首页 > 板块名

字段来源：

- `GET /api/boards/:slug`

### 3.2 板块头部

展示内容：

- 板块名
- 板块简介
- 发帖节奏相关氛围文案，可选

字段来源：

- `GET /api/boards/:slug`
- `data.board.name`
- `data.board.description`

### 3.3 置顶帖区

每条置顶帖建议显示：

- 标题
- 发帖人昵称
- 用户头衔
- 回复数
- 最后回复时间

字段来源：

- `data.pinned_threads[]`

### 3.4 普通主题列表

每行建议展示：

- 主题图标
- 标题
- 作者昵称
- 作者头像小图，可选
- 回复数
- 浏览量展示值
- 发布时间
- 最后回复时间

字段来源：

- `data.threads[]`

作者区域字段：

- `author.display_name`
- `author.avatar_url`
- `author.user_title`
- `author.user_group_name`

### 3.5 分页

字段来源：

- `data.pagination.page`
- `data.pagination.pageSize`
- `data.pagination.total`
- `data.pagination.totalPages`

## 4. 帖子详情页线框

推荐结构从上到下：

1. 面包屑
2. 主题标题栏
3. 主楼
4. 回复楼层列表
5. 分页

### 4.1 标题栏

展示内容：

- 帖子标题
- 所属板块名
- 发布时间

字段来源：

- `GET /api/threads/:id`

### 4.2 单层楼布局建议

建议采用左右结构：

- 左侧窄栏：作者信息
- 右侧主栏：正文与签名档

左侧作者信息建议顺序：

1. 昵称
2. 头像
3. 用户组名
4. 用户头衔
5. 板块称号
6. 积分
7. 发帖数
8. 注册时间
9. 来自地区
10. 徽章

右侧正文区建议顺序：

1. 楼层号
2. 发布时间
3. 正文 HTML
4. 签名档

### 4.3 主楼字段映射

字段来源：

- `GET /api/threads/:id`

建议字段：

- `data.thread.id`
- `data.thread.title`
- `data.thread.published_at`
- `data.thread.content_html`
- `data.thread.author_snapshot`

### 4.4 回复字段映射

字段来源：

- `GET /api/threads/:id/posts`

每层楼至少消费：

- `id`
- `floor_number`
- `published_at`
- `content_html`
- `author_snapshot.display_name`
- `author_snapshot.avatar_url`
- `author_snapshot.signature_text`
- `author_snapshot.user_group_name`
- `author_snapshot.user_title`
- `author_snapshot.board_title`
- `author_snapshot.points_display`
- `author_snapshot.post_count_display`
- `author_snapshot.essence_count_display`
- `author_snapshot.registered_at_display`
- `author_snapshot.location_display`
- `author_snapshot.badges[]`

## 5. 表情渲染约束

前端不应自行发明表情语法。

推荐两种实现方式选一：

### 5.1 后端输出最终安全 HTML

前端只渲染 `content_html`。

优点：

- 前端简单
- 规则统一

### 5.2 后端输出结构化 token

前端按 token 渲染表情和文本。

优点：

- 更可控

首版推荐：

- 采用后端输出安全 HTML

## 6. 空状态与错误态

首页空状态：

- 若无板块，显示“论坛正在整理版面”

版块空状态：

- 若无主题帖，显示“本版还没有帖子”

帖子空状态：

- 若无回复，显示“暂时还没有人跟帖”

错误态要求：

- 不出现现代产品式夸张插画
- 保持论坛样式的一致性

## 7. 视觉方向约束

前端 LLM 需要遵守：

- 有明显的边框和分栏结构
- 页面更像论坛索引页，不像资讯卡片流
- 尽量使用朴素但有年代感的配色
- 移动端可折叠，但不应完全失去论坛版式味道

## 8. 前端 Mock 数据建议

建议前端先准备：

- 首页 mock
- 单版块页 mock
- 单主题帖页 mock

特别要模拟：

- 同一角色不同身份模板的展示差异
- 表情渲染
- 徽章和板块称号
- 长签名档与短签名档

## 9. 前端交付验收标准

- 页面一眼看上去像 2000x 中文论坛
- 首页、版块页、帖子页信息层次清晰
- 用户侧栏信息充分但不拥挤
- 表情和签名档不会破坏排版
- 移动端仍可阅读主要信息