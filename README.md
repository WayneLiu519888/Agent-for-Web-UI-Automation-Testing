# Agent-for-Web-UI-Automation-Testing

基于 MCP 协议的 Web UI 自动化测试 MCP Server。**不录制、不写脚本** — Agent 读取页面 Accessibility Tree 结合 DOM 语义理解页面结构，按照 YAML 测试用例自主执行 Web 操作。

## 核心设计理念

```
测试人员写 Excel 用例 → case-generator 转 YAML → web-init 初始化浏览器
→ web-explore 探索页面 Acc Tree → test-case-executor 进程级并行执行 → 报告
```

## 架构

```
Agent-for-Web-UI-Automation-Testing     ← 编排层 (6 个 MCP 工具)
  web-init / web-explore / executor /
  case-generator / snapshot / scout
  职责: 环境编排、页面探索、Agent推理、
         测试报告、Acc Tree增强、组件发现
          │
          │ 委托底层浏览器操作
          ▼
@playwright/mcp  (23 个工具)            ← 执行层
  browser_navigate / click / type /
  fill_form / select / hover / snapshot
  take_screenshot / evaluate / tabs ...
```

## 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | >= 20.0.0 |
| npm | >= 9.0.0 |
| @playwright/mcp | 0.0.76 |
| playwright-core | 1.60.0 |
| @modelcontextprotocol/server | 2.0.0-alpha.2 |

## 快速开始

### 1. 克隆并安装

```bash
git clone https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing.git
cd Agent-for-Web-UI-Automation-Testing
npm install
```

### 2. 安装 Chromium 浏览器

```bash
npx playwright-core install chromium
```

### 3. 编译项目

```bash
npm run build
# tsc --noEmit: 零错误
```

### 4. 配置 Claude Desktop 使用 MCP

在 Claude Desktop 的 `settings.json` 中添加：

```json
{
  "mcpServers": {
    "webui-test": {
      "command": "node",
      "args": ["dist/entries/stdio.js"],
      "env": {
        "ENTERPRISE_ROOT": "./enterprise"
      }
    },
    "playwright-mcp": {
      "command": "npx",
      "args": ["@playwright/mcp", "--headless", "--browser=chromium"]
    }
  }
}
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run build` | TypeScript 编译到 dist/ |
| `npm run typecheck` | 类型检查 (tsc --noEmit) |
| `npm run start:stdio` | 启动 Stdio 模式 |
| `npm run start:http` | 启动 HTTP 模式 (默认端口 3000) |
| `npm run dev:stdio` | 开发模式 Stdio (热重载) |
| `npm run dev:http` | 开发模式 HTTP (热重载) |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | HTTP 监听端口 | `3000` |
| `MCP_HOST` | HTTP 监听地址 | `127.0.0.1` |
| `MCP_API_KEY` | Bearer Token 认证密钥 | (无，警告) |
| `ENTERPRISE_ROOT` | 企业机密层路径 | `./enterprise` |

## 项目目录

```
Agent-for-Web-UI-Automation-Testing/
├── README.md
├── mcp.config.yaml            # 全局配置
├── package.json / tsconfig.json / .gitignore
│
├── dictionaries/              # ★ 交互事件字典体系
│   ├── README.md
│   ├── base/                  # 基础字典(提交git)
│   │   ├── events.yaml        # 65 种交互事件
│   │   └── controls.yaml      # 20+ match 规则
│   └── projects/              # 项目字典(.gitignore)
│
├── src/
│   ├── core/                  # ★ 15 个核心引擎文件
│   │   ├── acc-tree.ts        # Acc Tree 增强采集
│   │   ├── interaction-inferrer.ts  # 配置驱动推断器
│   │   ├── locator-builder.ts # 多策略定位器
│   │   ├── explorer.ts        # BFS 页面探索
│   │   ├── worker-pool-manager.ts   # 进程级 Worker Pool
│   │   ├── task-scheduler.ts  # 优先级队列 + 工作窃取
│   │   ├── resource-detector.ts     # 机器资源检测
│   │   ├── yaml-reader.ts / yaml-writer.ts
│   │   ├── execution-plan.ts  # 执行计划生成
│   │   ├── report-aggregator.ts     # 报告聚合
│   │   ├── case-generator.ts  # Excel→YAML
│   │   ├── dom-collector.ts   # DOM 采集
│   │   ├── component-analyzer.ts    # 组件分析
│   │   └── config-generator.ts      # 项目配置生成
│   ├── tools/registry.ts     # 6 个 MCP 工具
│   ├── server/factory.ts     # McpServer 工厂
│   └── entries/stdio.ts + http.ts
│
├── enterprise/               # ★ 企业机密层(.gitignore)
│   ├── configs/mcp.enterprise.yaml
│   ├── environments/         # 测试环境配置
│   └── test-cases/           # 测试用例
│
└── .claude/plans/blueprint.plan.md  # 完整蓝图(2400+行)
```

## 6 个 MCP 工具

| 工具 | 命令 | 说明 |
|------|------|------|
| `web-init` | `/web-init` | 初始化测试环境 + 自动登录 |
| `web-explore` | `/web-explore` | 页面探索 → Acc Tree YAML |
| `test-case-executor` | `/exec-test` | 推理-执行分离 + 进程并行 |
| `case-generator` | `/gen-cases` | Excel → YAML 批量转换 |
| `web-snapshot` | `/snap` | 增强 Acc Tree 快照 |
| `web-component-scout` | `/scout` | 交互式组件发现 |

## 信息安全

双层分层：`src/` 开放源码 → GitHub。`enterprise/` 整目录 .gitignore → 永不提交。

## 许可证

Apache-2.0

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
