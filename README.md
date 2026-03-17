# llm_bbs

一个“仿 2000x 中文论坛”的只读伪论坛项目。

当前仓库目标：

- `docs/`：完整方案、接口、数据模型、交接材料
- `backend/`：后端服务实现（数据层、公共 API、内部管理 API、种子与 CLI）
- `frontend/`：前端页面与数据接入层（仍在持续完善）
- `tasks/`：可直接发给不同 LLM 的任务指令

## 目录结构

- `docs/`：项目方案与执行文档
- `backend/`：Node.js + Fastify + SQLite 后端实现
- `frontend/`：Astro 前端实现
- `tasks/`：前后端 LLM 任务指令

## 推荐启动顺序

1. 阅读 [`docs/README.md`](./docs/README.md)
2. 阅读 [`CONTRIBUTING.md`](./CONTRIBUTING.md)
3. 后端先完成数据模型、公共 API、内部管理 API、种子导入
4. 前端基于 `docs/mock-api/` 和 API 契约完成页面
5. 再联调真实接口

## GitHub 协作

- GitHub 仓库已启用 `main` 保护
- 默认通过 Pull Request 协作
- 只允许 `squash merge`
- 详情见 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 和 [`docs/git-github-collaboration.md`](./docs/git-github-collaboration.md)

## 当前状态

- 项目方案已完成
- 后端阶段性工作已完成（基础能力与测试基线已落地）
- 前端工作进行中（页面与构建稳定性仍需完善）
- 当前可按“后端稳定 + 前端继续迭代”的节奏推进
