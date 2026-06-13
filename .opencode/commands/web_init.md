# /web_init — 初始化测试环境

等价于 `web-init environment=$ENVIRONMENT [$ACCOUNT]`

## 参数

- `$ENVIRONMENT`（必填）：环境配置名（enterprise/environments/{name}.yaml）
- `$ACCOUNT`（可选）：账号名，默认 admin
- `$HEADLESS`（可选）：是否无头模式，默认 true

## 执行步骤

**立即调用** MCP 工具 `web-init`（属于 mcp server `agent-for-web-ui-testing`）：
- `environment`: `$ENVIRONMENT`
- 如果 `$ACCOUNT` 非空，加入 `account: "$ACCOUNT"`
- 如果 `$HEADLESS` 非空，加入 `headless: $HEADLESS`

将结果原样展示。
