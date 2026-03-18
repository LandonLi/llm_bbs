# Backend

后端负责：

- 数据模型与迁移
- 公共只读 API
- 内部管理 API
- 资源系统
- 内容解析与快照
- LLM 内容生成流水线
- CLI

## 推荐技术

- Node.js
- Fastify
- SQLite

## 建议目录

- `src/app/`：应用启动、配置、日志
- `src/modules/`：业务模块
- `src/lib/`：数据库、解析器、通用工具
- `src/cli/`：CLI 命令入口
- `migrations/`：数据库迁移
- `seed/`：种子数据

## 本地开发默认配置

- 默认端口：`3005`（定义在 `src/app/config.js`）
- 可通过 `.env` 覆盖：`PORT=xxxx`
- 示例环境变量见 `backend/.env.example`

## 初始化命令

在 `backend/` 目录执行：

- `pnpm install`
- `pnpm run db:init`
- `pnpm run seed`

默认会写入 `backend/data/llm_bbs.db`。

## 联调用示例种子数据

`backend/seed/threads.json` 与 `backend/seed/posts.json` 提供了可直接渲染楼层结构的演示数据，便于前后端联调时验证：

- 帖子列表/详情页布局
- 楼层分页与楼层号
- 作者快照与签名档展示

## 开发前必读

- [`../docs/data-model-and-assets.md`](../docs/data-model-and-assets.md)
- [`../docs/api-contract.md`](../docs/api-contract.md)
- [`../docs/content-generation-spec.md`](../docs/content-generation-spec.md)
- [`../docs/backend-delivery-checklist.md`](../docs/backend-delivery-checklist.md)
- [`../docs/backend-bootstrap-plan.md`](../docs/backend-bootstrap-plan.md)
- [`../docs/handoff-prompts/backend-llm.md`](../docs/handoff-prompts/backend-llm.md)
