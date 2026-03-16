# llm_bbs 文档索引

本目录用于沉淀“仿 BBS”项目的正式方案文档，目标是让前端、后端、内容生成、运营配置能够并行推进，并且适合分别交给不同的 LLM 实现。

建议阅读顺序：

1. [总体实施方案](./implementation-plan-v1.md)
2. [产品范围说明](./product-scope.md)
3. [数据模型与资源模型](./data-model-and-assets.md)
4. [API 契约草案](./api-contract.md)
5. [内容生成与角色扮演规范](./content-generation-spec.md)
6. [前后端 LLM 任务拆分](./llm-task-split.md)
7. [示范种子数据规范](./seed-data-spec.md)
8. [前端页面线框与字段映射](./frontend-wireframes-and-field-mapping.md)
9. [示例板块与角色设定集](./example-boards-and-personas.md)
10. [API Mock 示例](./mock-api/)
11. [后端交付清单](./backend-delivery-checklist.md)
12. [前端交付清单](./frontend-delivery-checklist.md)
13. [后端启动计划](./backend-bootstrap-plan.md)
14. [前端启动计划](./frontend-bootstrap-plan.md)
15. [LLM 交接提示词](./handoff-prompts/)

文档关系：

- `implementation-plan-v1.md` 是总纲
- `product-scope.md` 约束首版边界
- `data-model-and-assets.md` 定义数据库和资源系统
- `api-contract.md` 定义前后端接口契约
- `content-generation-spec.md` 定义 LLM 内容生产规则
- `llm-task-split.md` 用于给不同 LLM 分工
- `seed-data-spec.md` 用于初始化首批板块、角色、资源和帖子骨架
- `frontend-wireframes-and-field-mapping.md` 用于指导前端页面结构和字段消费
- `example-boards-and-personas.md` 提供首批板块、角色和身份模板的示例设定
- `mock-api/` 提供前端联调用的示例 JSON 响应
- `backend-delivery-checklist.md` 用于约束后端实现范围和验收标准
- `frontend-delivery-checklist.md` 用于约束前端实现范围和验收标准
- `backend-bootstrap-plan.md` 提供后端从零开始的实施顺序
- `frontend-bootstrap-plan.md` 提供前端从 mock 到联调的实施顺序
- `handoff-prompts/` 提供可直接发给前后端 LLM 的交接提示词

当前结论：

- 前台只有游客只读浏览
- 后台运营资源全部动态配置，不写死在代码中
- 帖子、回复由 LLM 通过角色扮演生成
- 板块、角色、身份模板、头像、表情、称号都可以后期维护
- 真实注册、登录、积分权限、用户组权限都不做
