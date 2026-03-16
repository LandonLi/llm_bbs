# 后端 LLM 任务指令

你将负责实现 `llm_bbs` 项目的后端部分。

## 项目背景

这是一个“仿 2000x 中文论坛”的只读伪论坛系统。

关键约束：

- 前台只有游客浏览，没有注册、登录、真人发帖
- 所有帖子和回复均由 LLM 通过角色扮演生成
- 板块、角色、身份模板、头像、表情、徽章都必须动态配置
- 同一角色需要支持多套身份模板
- 同一角色在同一主题的不同楼层可以切换昵称、头像、签名档
- 历史帖子必须保存展示快照，避免后续编辑污染旧内容

## 你要完成的目标

请在 `backend/` 目录内建立并实现一个可运行的后端服务，覆盖：

- 数据模型与数据库迁移
- 公共只读 API
- 内部管理 API
- 资源系统
- 内容解析与快照机制
- CLI
- LLM 内容生成流水线

## 必读文档

实现前请先以这些文档为准：

- [`docs/data-model-and-assets.md`](../docs/data-model-and-assets.md)
- [`docs/api-contract.md`](../docs/api-contract.md)
- [`docs/content-generation-spec.md`](../docs/content-generation-spec.md)
- [`docs/seed-data-spec.md`](../docs/seed-data-spec.md)
- [`docs/example-boards-and-personas.md`](../docs/example-boards-and-personas.md)
- [`docs/backend-delivery-checklist.md`](../docs/backend-delivery-checklist.md)
- [`docs/backend-bootstrap-plan.md`](../docs/backend-bootstrap-plan.md)

## 必须交付

### 1. 项目骨架

- 完善 `backend/package.json`
- 建立开发启动命令
- 建立源码目录结构
- 增加环境变量配置

### 2. 数据层

- 创建数据库迁移
- 建立核心表
- 支持初始化和重建数据库

### 3. 公共 API

必须实现：

- `GET /api/home`
- `GET /api/boards`
- `GET /api/boards/:slug`
- `GET /api/threads/:id`
- `GET /api/threads/:id/posts`
- `GET /api/site-meta`

### 4. 内部管理 API

至少支持：

- 板块增改停用
- 角色增改停用
- 身份模板增改停用
- 资源登记与启停
- 内容策略维护

### 5. 资源系统

- 头像资源
- 表情资源
- 徽章资源
- 可输出给前端直接使用的 URL

### 6. 快照机制

- 主帖保存作者展示快照
- 楼层保存作者展示快照
- 修改角色后旧内容不变

### 7. 内容生成

- 能在指定板块生成主题帖
- 能在指定主题帖生成回复
- 能记录生成任务与审计信息

### 8. CLI

至少支持：

- 初始化配置
- 导入种子数据
- 触发生成主帖
- 触发生成回复

## 明确不要做

- 注册/登录系统
- 用户权限系统
- 真实积分规则
- 真实用户组权限逻辑
- 真人发帖接口
- 在访客请求时实时调用 LLM

## 实现要求

- 字段命名尽量与文档完全一致
- 不要自行发明前端依赖字段
- 所有时间字段统一为 ISO 8601
- 内容解析必须限制在白名单语法内
- 表情只能使用受控标记

## 推荐顺序

1. 完成基础骨架
2. 完成数据库和迁移
3. 完成公共 API
4. 完成内部管理 API
5. 完成种子导入和 CLI
6. 完成快照机制
7. 完成内容生成流水线

## 完成后请输出

- 已实现的目录结构
- 已实现的接口清单
- 数据库表结构摘要
- CLI 用法
- 尚未完成项
- 已知风险

