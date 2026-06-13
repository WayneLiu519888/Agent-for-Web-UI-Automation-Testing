# CLAUDE.md — Agent-for-Web-UI-Automation-Testing

项目简称 **WebUI-Test**，一个基于 MCP 协议的 Web UI 自动化测试 MCP Server。

## 技术栈
- TypeScript 6.0+ / Node.js >=20 / ESM (NodeNext)
- @modelcontextprotocol/server 2.0.0-alpha.2 + @modelcontextprotocol/node + @modelcontextprotocol/express
- @playwright/mcp 0.0.76 + playwright-core 1.60.0
- Zod v4 / js-yaml / express / xlsx

## 核心架构

```
编排层 (6 个 MCP 工具)
  web-init / web-explore / test-case-executor / case-generator / web-snapshot / web-component-scout
        │ 委托底层浏览器操作
        ▼
执行层 @playwright/mcp (23 个工具)
  browser_navigate / browser_click / browser_type / browser_fill_form / browser_snapshot ...
```

## 关键设计决策
1. **编排层≠执行层** — 不重复实现 Playwright 浏览器操作，全部委托 Playwright MCP
2. **推理-执行分离** — Phase1(LLM批量规划)→Phase2(Worker Pool并行执行,零LLM)→Phase3(按需补救)
3. **进程级并行** — 每个 Worker = 独立 Node.js 子进程 + 独立 Chromium，用尽机器 CPU/内存；parGroup 亲和性调度避免同组认证任务分散到多个 Worker
4. **Acc Tree 8维融合** — DOM+A11y+Geometry+Locators+Interaction+Framework+Text+Children
5. **信息安全双层** — src/ 开源层→GitHub ✅ / enterprise/ 企业机密层→.gitignore ❌
6. **交互事件字典三级** — _overrides.yaml(人工) > components.yaml(自动) > base/controls.yaml(默认)
7. **纯 ESM 无 require()** — 项目 package.json `"type":"module"`，`require()` 在 ESM 模块中不可用会导致运行时崩溃。动态加载必须使用 `await import()`，静态加载使用顶部 `import`。CJS 互操作需手动处理 `(mod as any).default ?? mod`

## 目录结构
```
src/
├── types/              # tool.ts / interaction-events.ts / yaml.ts
├── utils/paths.ts       # 双层路径解析 (企业覆盖优先)
├── server/factory.ts    # McpServer 工厂 (按 transport 过滤工具)
├── entries/stdio.ts + http.ts  # 双入口
└── capability/          # 两层架构重构后的能力层
    ├── engine/          # 9 个核心引擎文件
    │   ├── acc-tree.ts  / interaction-inferrer.ts  / locator-builder.ts
    │   ├── explorer.ts  / execution-plan.ts
    │   ├── worker-pool-manager.ts / task-scheduler.ts / resource-detector.ts
    │   └── dom-collector.ts
    ├── playwright/      # Playwright 封装适配 (pw-tools.ts 合并封装 + adapter.ts 接口)
    ├── yaml/            # YAML 读写工具 (reader.ts + writer.ts)
    ├── excel/           # Excel 转换工具 (parser.ts + converter.ts)
    ├── config/          # 配置加载工具 (loader.ts + generator.ts)
    ├── report/          # 报告生成工具 (aggregator.ts + writer.ts)
    ├── analysis/        # 组件分析 (component-analyzer.ts + component-scout.ts)
    └── tools/           # MCP 工具注册 (registry.ts + index.ts)
```

## 常用命令
- `npm run build` — tsc 编译
- `npm run typecheck` — 纯类型检查
- `npm run dev:stdio` — 开发模式 Stdio

## 密码格式
所有密码/密钥通过 `${ENV_VAR}` 从环境变量注入，禁止硬编码到源码或 YAML 配置中。

## 蓝图
完整设计蓝图：`docs/blueprint.plan.md` (~2500 行)
