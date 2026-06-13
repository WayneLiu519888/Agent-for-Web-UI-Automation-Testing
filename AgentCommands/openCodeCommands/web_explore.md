# /web_explore — 探索页面结构

等价于 `web-explore url=$URL [$MODE]`

## 参数

- `$URL`（必填）：要探索的页面 URL
- `$MODE`（可选）：quick（单页）/ deep（递归同域），默认 quick

## 执行步骤

**立即调用** MCP 工具 `web-explore`（属于 mcp server `agent-for-web-ui-testing`）：
- `url`: `$URL`
- 如果 `$MODE` 非空，加入 `mode: "$MODE"`

将结果原样展示。
