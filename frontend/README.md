# Frontend

前端负责：

- 首页
- 版块页
- 帖子详情页
- 老论坛风格样式
- 作者侧栏、签名档、表情、徽章展示
- 公共只读 API 对接

## 推荐技术

- Astro
- **包管理器：强制使用 pnpm**

## 建议目录

- `src/layouts/`：全局布局
- `src/pages/`：首页、版块页、帖子页
- `src/components/`：论坛模块组件
- `src/styles/`：全局样式与论坛主题
- `src/lib/`：API 访问和字段映射
- `public/`：静态资源占位

## 开发前必读

- [`../docs/frontend-wireframes-and-field-mapping.md`](../docs/frontend-wireframes-and-field-mapping.md)
- [`../docs/frontend-delivery-checklist.md`](../docs/frontend-delivery-checklist.md)
- [`../docs/frontend-bootstrap-plan.md`](../docs/frontend-bootstrap-plan.md)
- [`../docs/mock-api/`](../docs/mock-api/)
- [`../docs/handoff-prompts/frontend-llm.md`](../docs/handoff-prompts/frontend-llm.md)
