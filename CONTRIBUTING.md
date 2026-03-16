# Contributing Guide

本项目默认由多人或多个 LLM 协作完成。开始实现前，请先阅读：

- [`README.md`](./README.md)
- [`docs/README.md`](./docs/README.md)
- [`docs/git-github-collaboration.md`](./docs/git-github-collaboration.md)

## 基本原则

- 不要直接在 `main` 上开发
- 先读文档，再改代码
- 不要自行扩大产品范围
- API、数据模型、页面字段变更必须同步更新文档
- 提交应尽量小而清晰

## 分支规则

- 功能分支统一使用 `codex/` 前缀
- 推荐格式：`codex/<area>-<short-topic>`

示例：

- `codex/backend-api-foundation`
- `codex/frontend-home-board-thread`
- `codex/docs-git-workflow`

## 提交规则

- 一次提交只做一类事情
- 提交信息使用简短祈使句
- 推荐格式：`<area>: <change>`

示例：

- `docs: add git and github collaboration workflow`
- `backend: scaffold fastify app entry`
- `frontend: add forum page shells`

## Pull Request 规则

- PR 应聚焦单一目标
- PR 描述必须说明变更范围、风险、验证方式
- 如果改了接口或字段，必须指出受影响文档和前后端联动点

## 文档同步规则

以下变更必须同步更新 `docs/`：

- 数据模型变更
- API 结构变更
- 页面字段变更
- 生成规则变更
- 协作流程变更

## 禁止事项

- 未经确认添加注册、登录、真人发帖等功能
- 未经确认改动产品边界
- 把历史展示快照逻辑改为动态读取角色当前资料
- 在访客请求时实时触发 LLM 发帖

## 协作建议

- 后端先冻结契约，再由前端对接
- 前端发现字段不足时，优先提契约问题，不自行发明字段
- 多个 LLM 接力时，每次都应先汇报已完成、未完成、风险
