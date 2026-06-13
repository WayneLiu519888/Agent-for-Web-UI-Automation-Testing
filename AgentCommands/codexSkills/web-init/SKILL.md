---
name: web-init
description: 初始化Web测试环境并自动登录。读取环境YAML→委托Playwright MCP启动浏览器→执行登录流程→保存登录态。参数 environment(必填:环境配置名), account(可选:账号名,默认admin), headless(可选:是否无头,默认true)。
---

# web-init — 初始化测试环境

**立即调用** `mcp__agent-for-web-ui-testing__web-init`：
- `environment`: 用户指定的环境名
- 如果用户提供了账号名，加上 `account`
- 如果用户指定了 headless=false，加上 `headless: false`

不要做额外确认，直接展示结果。
