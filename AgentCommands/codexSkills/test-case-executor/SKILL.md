---
name: test-case-executor
description: 并行执行YAML测试用例。推理-执行分离三阶段(LLM推理→Worker Pool并行→失败补救)。参数 cases(必填:用例YAML路径数组), parallel(可选:auto/number/serial,默认auto), plan_mode(可选:sprint/strict/hybrid,默认sprint)。
---

# test-case-executor — 并行执行用例

**立即调用** `mcp__agent-for-web-ui-testing__test-case-executor`：
- `cases`: 用户指定的用例路径数组
- `parallel`: 用户指定或 `"auto"`
- `plan_mode`: 用户指定或 `"sprint"`

不要做额外确认，直接展示结果。
