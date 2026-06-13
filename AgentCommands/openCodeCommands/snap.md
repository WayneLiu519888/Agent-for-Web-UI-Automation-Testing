# /snap — 增强页面快照

等价于 `web-snapshot [$COMPACT]`

## 参数

- `$COMPACT`（可选）：true=紧凑模式（仅 ref+role+actionable+locators 前2级）

## 执行步骤

**立即调用** MCP 工具 `web-snapshot`（属于 mcp server `agent-for-web-ui-testing`）：
- 如果 `$COMPACT` == "true"，加入 `compact: true`

将结果原样展示。
