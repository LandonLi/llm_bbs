# Git / GitHub 协作流程

## 1. 目标

本流程用于约束多人或多个 LLM 在同一仓库中的协作方式，尽量减少以下问题：

- 各自发明需求
- 同时改同一块契约导致冲突
- 前后端字段不一致
- 改了代码却没同步文档
- PR 范围过大，难以审阅

## 2. 分支模型

### 2.1 主分支

- `main` 只保留可用状态
- 不直接在 `main` 上开发
- 所有开发都通过功能分支完成

### 2.1.1 当前仓库已生效的 GitHub 规则

以下规则已经在 GitHub 仓库侧实际启用：

- 仓库当前为 `public`
- `main` 已开启分支保护
- 合并到 `main` 必须通过 Pull Request
- `main` 要求签名提交
- `main` 禁止 force push
- `main` 禁止删除
- 启用线性历史
- 要求 conversation resolved 后再合并
- 只允许 `squash merge`
- 已关闭 `merge commit`
- 已关闭 `rebase merge`
- 合并后自动删除分支

当前未强制的项目：

- 不强制最少审批人数
- 不强制 code owner review
- 不强制 status checks

### 2.2 功能分支命名

统一使用 `codex/` 前缀：

- `codex/backend-...`
- `codex/frontend-...`
- `codex/docs-...`
- `codex/chore-...`

推荐格式：

- `codex/<area>-<short-topic>`

示例：

- `codex/backend-schema-and-public-api`
- `codex/frontend-retro-thread-layout`
- `codex/docs-seed-and-mock-alignment`

## 3. 工作起手式

每个执行者开始前都应：

1. 阅读根 `README.md`
2. 阅读 `docs/README.md`
3. 阅读与自己职责相关的任务书和交接提示
4. 确认本次目标只覆盖一个明确范围

对于不同角色：

- 后端优先看数据模型、API、生成规范
- 前端优先看页面线框、mock 数据、字段映射

## 4. 开发顺序建议

推荐总体顺序：

1. 文档冻结首版边界
2. 后端冻结数据模型和 API 契约
3. 前端按 mock 数据开发
4. 后端完成真实接口
5. 前后端联调
6. 后端再补内容生成与调度

推荐单次任务顺序：

1. 新建分支
2. 读取相关文档
3. 实现一个小目标
4. 自检
5. 更新必要文档
6. 提交
7. 发起 PR

## 5. 提交粒度

建议一次提交只做一类事情。

好的提交示例：

- 新增数据库迁移
- 新增首页与版块页静态骨架
- 调整 API 响应结构并同步文档
- 新增种子导入脚本

不好的提交示例：

- 同时改前端页面、后端接口、文档、样式、脚本，且没有清晰说明

## 6. Commit Message 规范

推荐格式：

`<area>: <change>`

可用 area：

- `docs`
- `backend`
- `frontend`
- `seed`
- `chore`

示例：

- `docs: add git and github collaboration workflow`
- `backend: add public thread routes`
- `frontend: scaffold board and thread pages`
- `seed: add initial board and persona fixtures`

## 7. Pull Request 规范

### 7.1 一个 PR 应回答的问题

- 这次改了什么
- 为什么要改
- 影响哪些模块
- 如何验证
- 还有哪些未完成项

### 7.2 推荐 PR 范围

优先提交小 PR：

- 一个后端基础能力
- 一个前端页面块
- 一次契约同步
- 一组文档修订

由于仓库只允许 `squash merge`，每个 PR 更应该保持单一目标，避免把不相关改动压进同一个 squash 提交。

### 7.3 PR 标题建议

推荐格式：

- `backend: scaffold schema and public read api`
- `frontend: build retro home and board pages`
- `docs: align mock api with field mapping`

## 8. 文档变更规则

以下变更必须同步文档：

- 数据表结构变化
- API 字段变化
- 页面字段依赖变化
- 生成规则变化
- 资源模型变化

优先更新的文档：

- `docs/data-model-and-assets.md`
- `docs/api-contract.md`
- `docs/frontend-wireframes-and-field-mapping.md`
- `docs/content-generation-spec.md`

## 9. 前后端协作规则

### 9.1 后端规则

- 后端不得随意改字段名称
- 改字段前先更新契约文档
- 需要返回的展示快照字段必须完整

### 9.2 前端规则

- 前端不得在未约定的情况下自行发明字段
- 遇到字段不足应先提契约问题
- mock 数据字段与真实 API 不一致时，先修契约

## 10. 多 LLM 接力规则

当一个 LLM 把任务交给另一个 LLM 时，交接内容至少包括：

- 当前分支名
- 已完成内容
- 未完成内容
- 关键文件路径
- 风险与注意事项
- 是否改过文档契约

推荐交接格式：

1. 当前目标
2. 已完成内容
3. 剩余工作
4. 风险与阻塞
5. 建议下一步

## 11. 冲突处理规则

如果出现以下情况，应先停下并说明：

- 文档互相冲突
- 前后端字段不一致
- 发现当前任务会扩大产品范围
- 发现已有改动会破坏历史快照设计

处理原则：

- 优先最小修改
- 优先改文档再改实现
- 不隐式重定义边界

## 12. 合并前检查清单

每次合并前至少检查：

- 分支是否只做单一目标
- 文档是否同步
- API 变更是否说明
- 是否影响前后端联调
- 是否引入了不在范围内的新功能

## 13. 当前 GitHub 配置

当前仓库实际配置：

- `main` 分支保护：已启用
- Pull Request 合并：已启用
- squash merge：已启用
- merge commit：已关闭
- rebase merge：已关闭
- delete branch on merge：已启用
- signed commits on main：已启用

当前执行建议：

- 小 PR
- 明确 PR 描述
- 合并前自检
- 不要尝试直接推送到 `main`

## 14. 一版执行建议

建议先拆三类 PR：

- `docs/*`：文档和契约
- `backend/*`：后端基础能力
- `frontend/*`：前端页面与样式

这样最容易让多个 LLM 并行协作而不互相踩线。
