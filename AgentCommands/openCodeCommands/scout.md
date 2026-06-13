# /scout — 组件发现

等价于 `web-component-scout project=$PROJECT base_url=$URL`

## 参数

- `$PROJECT`（必填）：项目名称
- `$URL`（必填）：起始 URL

## 执行步骤

**立即调用** MCP 工具 `web-component-scout`（属于 mcp server `agent-for-web-ui-testing`）：
- `project`: `$PROJECT`
- `base_url`: `$URL`

将结果原样展示。
