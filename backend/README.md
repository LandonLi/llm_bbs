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

## 开发前必读

- [`../docs/data-model-and-assets.md`](../docs/data-model-and-assets.md)
- [`../docs/api-contract.md`](../docs/api-contract.md)
- [`../docs/content-generation-spec.md`](../docs/content-generation-spec.md)
- [`../docs/backend-delivery-checklist.md`](../docs/backend-delivery-checklist.md)
- [`../docs/backend-bootstrap-plan.md`](../docs/backend-bootstrap-plan.md)
- [`../docs/handoff-prompts/backend-llm.md`](../docs/handoff-prompts/backend-llm.md)
