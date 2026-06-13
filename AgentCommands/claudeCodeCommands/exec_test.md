---
description: "【快捷命令】并行执行测试用例"
arguments:
  - name: cases
    description: "用例YAML文件路径(支持glob)，多个用逗号分隔"
    required: true
  - name: parallel
    description: "并行数 — auto(自动)/number/serial（默认 auto）"
    required: false
  - name: plan_mode
    description: "推理模式 — sprint/strict/hybrid（默认 sprint）"
    required: false
---

# /exec_test — 并行执行测试用例

等价于 `test-case-executor cases=[{cases}] [parallel={parallel}] [plan_mode={plan_mode}]`

**立即调用** `mcp__agent-for-web-ui-testing__test-case-executor`，参数：
- `cases`: {{cases}} 解析为字符串数组
- 如果用户提供了 parallel，加上 `parallel`: "{{parallel}}"
- 如果用户提供了 plan_mode，加上 `plan_mode`: "{{plan_mode}}"

不要做任何额外确认，直接调用工具并展示结果。
