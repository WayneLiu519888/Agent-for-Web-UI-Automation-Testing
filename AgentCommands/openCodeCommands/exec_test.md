# /exec_test — 并行执行测试用例

等价于 `test-case-executor cases=$CASES [$PARALLEL] [$PLAN_MODE]`

## 参数

- `$CASES`（必填）：用例 YAML 文件路径，支持 glob，多个用逗号分隔
- `$PARALLEL`（可选）：并行数 — auto(自动)/number/serial，默认 auto
- `$PLAN_MODE`（可选）：sprint/strict/hybrid，默认 sprint

## 执行步骤

**立即调用** MCP 工具 `test-case-executor`（属于 mcp server `agent-for-web-ui-testing`）：
- `cases`: 将 `$CASES` 按逗号拆分为字符串数组
- 如果 `$PARALLEL` 非空，加入参数
- 如果 `$PLAN_MODE` 非空，加入 `plan_mode: "$PLAN_MODE"`

将结果原样展示。
