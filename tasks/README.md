# Tasks

本目录用于放置可直接复制给不同 LLM 的任务指令。

当前建议：

- `backend-llm-task.md`
- `frontend-llm-task.md`

这些任务指令会引用 `docs/` 中已经冻结的方案文档，避免不同 LLM 各自发明边界。

推荐使用方式：

1. 将 `backend-llm-task.md` 直接发给后端 LLM
2. 将 `frontend-llm-task.md` 直接发给前端 LLM
3. 要求两边都先阅读各自引用的 `docs/` 文档，再开始实现
