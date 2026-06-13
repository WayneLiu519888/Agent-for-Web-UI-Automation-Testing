---
description: "【快捷命令】初始化Web测试环境并自动登录"
arguments:
  - name: environment
    description: "环境配置名（对应 enterprise/environments/{name}.yaml）"
    required: true
  - name: account
    description: "使用的账号名（默认 admin）"
    required: false
  - name: headless
    description: "是否无头模式 — true/false（默认 true）"
    required: false
---

# /web_init — 初始化测试环境

等价于 `web-init environment={environment} [account={account}] [headless={headless}]`

**立即调用** `mcp__agent-for-web-ui-testing__web-init`，参数：
- `environment`: "{{environment}}"
- 如果用户提供了 account，加上 `account`: "{{account}}"
- 如果用户提供了 headless，加上 `headless`: {{headless}}

不要做任何额外确认，直接调用工具并展示结果。
