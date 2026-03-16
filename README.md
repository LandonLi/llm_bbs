# llm_bbs

一个“仿 2000x 中文论坛”的只读伪论坛项目。

当前仓库目标：

- `docs/`：完整方案、接口、数据模型、交接材料
- `backend/`：后端骨架，供后端 LLM 接手实现
- `frontend/`：前端骨架，供前端 LLM 接手实现
- `tasks/`：可直接发给不同 LLM 的任务指令

## 目录结构

- `docs/`：项目方案与执行文档
- `backend/`：Node.js + Fastify + SQLite 方向的后端骨架
- `frontend/`：Astro 方向的前端骨架
- `tasks/`：前后端 LLM 任务指令

## 推荐启动顺序

1. 阅读 [`docs/README.md`](./docs/README.md)
2. 阅读 [`CONTRIBUTING.md`](./CONTRIBUTING.md)
3. 后端先完成数据模型、公共 API、内部管理 API、种子导入
4. 前端基于 `docs/mock-api/` 和 API 契约完成页面
5. 再联调真实接口

## 当前状态

- 项目方案已完成
- 骨架已建立
- 尚未安装依赖
- 尚未开始真实编码实现
