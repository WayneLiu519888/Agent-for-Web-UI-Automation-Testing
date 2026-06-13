<p align="center">
  <br/>
  <img src="https://img.shields.io/badge/Node.js-20%2B-brightgreen?logo=nodedotjs" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/npm-9%2B-red?logo=npm" alt="npm 9+">
  <img src="https://img.shields.io/badge/MCP-2.0.0_alpha-blue?logo=openai" alt="MCP 2.0.0-alpha">
  <img src="https://img.shields.io/badge/Playwright-1.60.0-2EAD33?logo=playwright" alt="Playwright 1.60.0">
  <img src="https://img.shields.io/badge/Apache-2.0-9966FF?logo=apache" alt="Apache-2.0 License">
  <br/>
  <img src="https://img.shields.io/badge/TypeScript-zero_errors-informational?logo=typescript" alt="TypeScript 零错误">
  <img src="https://img.shields.io/badge/核心引擎-15_files-blueviolet" alt="15 个核心文件">
  <img src="https://img.shields.io/badge/MCP工具-6_tools-critical" alt="6 个 MCP 工具">
  <img src="https://img.shields.io/badge/交互事件-65_events-yellow" alt="65 种交互事件">
</p>

<h1 align="center">Agent-for-Web-UI-Automation-Testing</h1>

<p align="center">
  <strong>不录制、不写脚本 —— 为 AI Agent 打造的 Web UI 自动化测试 MCP Server</strong>
</p>

<p align="center">
  Agent 读取页面 Accessibility Tree 结合 DOM 语义理解页面结构，<br/>
  按纯文本 YAML 用例自主推理并进程级并行执行 Web 操作。
</p>

<hr/>

<details open>
<summary><strong>📋 快速指引</strong></summary>

| 我想... | 看这里 |
|:---|:---|
| 快速把项目跑起来 | [🚀 快速开始](#-快速开始) |
| 了解能做什么 | [🧠 核心概念](#-核心概念) |
| 看有哪些工具可用 | [🛠️ 6 个 MCP 工具](#️-6-个-mcp-工具) |
| 配置 Claude Desktop | [📥 安装方式](#-安装方式) |
| 看完整的 2500+ 行设计蓝图 | [`.claude/plans/blueprint.plan.md`](.claude/plans/blueprint.plan.md) |
</details>

---

## 📦 包含内容

| 分类 | 内容 | 文件数 |
|------|------|:---:|
| 🧠 **核心引擎** | Acc Tree 采集、交互事件推断、多策略定位器、YAML 读写 | 15 个 |
| 🛠️ **MCP 工具** | init / explore / executor / generator / snapshot / scout | 6 个 |
| 📖 **字典体系** | 65 种交互事件 + 20+ 声明式 match 规则 | 3 个 YAML |
| 🔒 **安全分层** | 开源层(提交 GitHub) ↔ 企业机密层(.gitignore) | 双层 |
| 🚀 **并行引擎** | 推理-执行分离 + 进程级 Worker Pool + 资源感知调度 | 4 个核心 |

> 这不仅仅是一个 MCP Server。它是一个**从"测试人员人工操作浏览器"到"Agent 自主并行执行 20 个 Chromium"的效率革命**。

---

## 🧠 核心概念

### 编排层 ≠ 执行层

```
┌──────────────────────────────────────────────┐
│  Agent-for-Web-UI-Automation-Testing         │
│  编排层 — 6 个 MCP 工具                      │
│                                              │
│  环境编排 → 页面探索 → LLM 推理 → 进程并行   │
│  Acc Tree 增强 → 组件发现 → Excel 转 YAML    │
└──────────────────┬───────────────────────────┘
                   │ 委托底层浏览器操作
                   ▼
┌──────────────────────────────────────────────┐
│  @playwright/mcp — 执行层 — 23 个工具         │
│  navigate / click / type / fill_form /       │
│  select / hover / snapshot / screenshot / ... │
└──────────────────────────────────────────────┘
```

> 📐 **为什么这样设计？** Playwright MCP 已经有 23 个成熟的浏览器操作工具，我们不做重复轮子。我们的 6 个工具专注于**编排层**——环境初始化、页面探索工作流、用例推理调度、并行执行管理。

### 推理-执行分离（核心突破）

```
Phase 1 — LLM 批量推理 (主进程, 约 1-3 min)
  所有用例 → LLM → ExecutionPlan（纯 Playwright 操作序列）
  
Phase 2 — 进程级并行执行 (Worker Pool, 无 LLM)
  Worker-1 (Chromium-1) ─┐
  Worker-2 (Chromium-2) ─┼─→ 20 个 Chromium 真正同时运转
  ...                     │   无需 LLM，不受 rate limit
  Worker-N (Chromium-N) ─┘
  
Phase 3 — 按需补救 (LLM)
  失败用例 → 错误截图 + Acc Tree → LLM → Worker 重试
```

> 💡 **关键**：Phase 1 集中推理一次，Phase 2 就可以**完全无 LLM** 地并行——这是突破 LLM rate limit 瓶颈的唯一方式。

### Acc Tree 8 维融合快照

每个页面元素采集：`DOM` + `A11y` + `Geometry` + `Locators` + `Interaction` + `Framework` + `Text` + `Children`

> 📖 详见 [蓝图第二章](.claude/plans/blueprint.plan.md)

### 交互事件字典（可配置）

```
dictionaries/
├── base/events.yaml      # 65 种交互事件注册表（11 类别）
└── base/controls.yaml    # 20+ 声明式 match 规则引擎
```

**三级优先级**：`_overrides.yaml (人工)` → `components.yaml (自动)` → `base/controls.yaml (默认)`

---

## 🚀 快速开始

### 1️⃣ 克隆并安装

```bash
git clone https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing.git
cd Agent-for-Web-UI-Automation-Testing
npm install
```

### 2️⃣ 安装 Chromium 浏览器

```bash
npx playwright-core install chromium
```

### 3️⃣ 编译项目

```bash
npm run build
# tsc --noEmit: 零错误
```

### 4️⃣ 验证 MCP Server 启动

```bash
# Stdio 模式（Claude Desktop 用）
npm run start:stdio

# HTTP 模式（远程访问用）
MCP_API_KEY=your-secret npm run start:http
```

---

## 📥 安装方式

### Claude Desktop

`settings.json`:

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

### OpenCode / VS Code 插件

在 `.opencode/settings.json` 或 VS Code MCP 配置中同样添加以上两段 `mcpServers`。

### HTTP 远程模式

```bash
# 安全模式（推荐）
MCP_API_KEY=my-secret-key MCP_HOST=0.0.0.0 PORT=3000 npm run start:http

# 开发模式
npm run dev:http
```

---

## 🛠️ 6 个 MCP 工具

| 我想... | 使用此命令 | 工具 | 细节 |
|:---|:---|:---|:---|
| 一键初始化浏览器并自动登录 | `/web-init test-env` | `web-init` | 读取环境 YAML → 执行登录流程 → 保存登录态 |
| 探索页面结构生成 Acc Tree | `/web-explore https://xxx --mode=deep` | `web-explore` | BFS 递归爬取同域页面 → 每个页面一个 YAML |
| 并行执行测试用例 | `/exec-test test-cases/login/*.yaml` | `test-case-executor` | Phase 1 LLM 推理 → Phase 2 Worker Pool 执行 |
| Excel 用例转 YAML | `/gen-cases test-cases/登录模块.xlsx` | `case-generator` | 智能列名匹配（中英文多别名） |
| 获取当前页面增强快照 | `/snap` | `web-snapshot` | DOM + A11y + 几何 + 定位器 + 事件 |
| 发现项目专属组件 | `/scout my-app --url=https://xxx` | `web-component-scout` | 交互式浏览 → 生成项目组件配置 |

### 工具 Visibility 分级

| 可见性 | 含义 | Stdio 模式 | HTTP 模式 |
|:---|:---|:---:|:---:|
| `all` | 所有模式可见 | ✅ | ✅ |
| `stdio` | 仅本地 Stdio 可见 | ✅ | ❌ |
| `http` | 仅远程 HTTP 可见 | ❌ | ✅ |

所有 6 个工具均为 `all` 级别。

> 📖 完整工具设计见 [蓝图第三章](.claude/plans/blueprint.plan.md)

---

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|:---|:---|:---|
| `PORT` | HTTP 模式监听端口 | `3000` |
| `MCP_HOST` | HTTP 监听地址 | `127.0.0.1` |
| `MCP_API_KEY` | Bearer Token 认证密钥 | ⚠️ 未设置时无认证 |
| `ENTERPRISE_ROOT` | 企业机密层路径 | `./enterprise` |

---

## 📂 仓库目录

```
Agent-for-Web-UI-Automation-Testing/
│
├── mcp.config.yaml              # 全局配置（浏览器/探索器/执行器/报告/日志）
├── package.json / tsconfig.json / .gitignore
├── README.md
│
├── dictionaries/                # ★ 交互事件字典体系
│   ├── README.md                #   字典说明 + match 语法文档
│   ├── base/                    #   基础字典 — 提交 git
│   │   ├── events.yaml          #     65 种交互事件
│   │   └── controls.yaml        #     20+ match 规则
│   └── projects/                #   项目字典 — .gitignore
│
├── src/
│   ├── core/                    # ★ 15 个核心引擎文件
│   │   ├── acc-tree.ts          #     Acc Tree 增强采集
│   │   ├── interaction-inferrer.ts  # 配置驱动事件推断
│   │   ├── locator-builder.ts   #     多策略定位器
│   │   ├── explorer.ts          #     BFS 页面探索
│   │   ├── worker-pool-manager.ts   # 进程级 Worker Pool
│   │   ├── task-scheduler.ts    #     优先级队列 + 工作窃取
│   │   ├── resource-detector.ts #     机器资源检测
│   │   ├── yaml-reader.ts       #     YAML 读取
│   │   ├── yaml-writer.ts       #     YAML 写入
│   │   ├── execution-plan.ts    #     执行计划生成
│   │   ├── report-aggregator.ts #     报告聚合
│   │   ├── case-generator.ts    #     Excel→YAML
│   │   ├── dom-collector.ts     #     DOM 采集
│   │   ├── component-analyzer.ts#     组件分析
│   │   └── config-generator.ts  #     项目配置生成
│   ├── types/                   #   类型定义
│   │   ├── tool.ts
│   │   ├── interaction-events.ts
│   │   └── yaml.ts
│   ├── tools/registry.ts        #   6 个 MCP 工具注册
│   ├── server/factory.ts        #   McpServer 工厂
│   ├── config/loader.ts         #   双层配置加载
│   ├── utils/paths.ts           #   双层路径解析
│   └── entries/stdio.ts + http.ts
│
├── enterprise/                  # ★ 企业机密层 — .gitignore 整目录
│   ├── configs/mcp.enterprise.yaml
│   ├── environments/            #   测试环境（URL/账号/租户）
│   ├── test-cases/              #   企业测试用例
│   ├── acc-trees/               #   探索产物
│   └── auth/                    #   登录态
│
└── .claude/plans/blueprint.plan.md  # 完整蓝图(2500+ 行)
```

---

## 🔒 信息安全

```
┌─────────────────────────────────┐
│ Layer 1: 开放源码层              │
│ src/ docs/ dictionaries/base/   │  → 提交 GitHub ✅
│ package.json README.md          │
├─────────────────────────────────┤
│ Layer 2: 企业机密层              │
│ enterprise/ 整目录               │  → .gitignore ❌
│   URL / 账号 / 租户 / 登录态    │     永不提交到 GitHub
│   测试用例 / Acc Tree / 截图    │
└─────────────────────────────────┘
```

4 重防护：`.gitignore` + Pre-commit hook + `paths.ts` 代码层隔离 + 双层 Remote 工作流。

> 📖 详见 [蓝图第十章](.claude/plans/blueprint.plan.md)

---

## ❓ FAQ

<details>
<summary><strong>为什么不做传统的"录制回放"模式？</strong></summary>

录制回放的致命问题是**脆**——页面改一个 class 名或用例加一步，脚本全废。我们的方案是：测试人员写**自然语言用例**（不是代码），Agent 读取页面 Acc Tree 推理执行。改用例改文本即可，不需要重新"录制"。
</details>

<details>
<summary><strong>为什么依赖 Playwright MCP 而不是直接调 Playwright？</strong></summary>

Playwright MCP 已经封装了 23 个成熟的浏览器操作工具——我们不需要重复造轮子。它在 LLM 环境中已可用，我们的 6 个编排层工具直接委托它执行底层操作。详见[第三章](.claude/plans/blueprint.plan.md)。
</details>

<details>
<summary><strong>为什么要"推理-执行分离"？</strong></summary>

如果每个 Worker 内部都调用 LLM 做推理，LLM API rate limit 会让 20 个 Worker 排队等待，并行毫无意义。Phase 1 集中推理一次（1-3 分钟），Phase 2 的 20 个 Worker 就可以**完全无 LLM** 地并行执行——这是唯一突破 rate limit 的方式。
</details>

<details>
<summary><strong>20 个 Chromium 内存不会爆吗？</strong></summary>

启动时会自动检测机器资源（`resource-detector.ts`）。16C32T + 64GB 典型机：推荐 `max_workers=12`。运行时内存 < 1GB 自动暂停分配新任务。详见[第十二章](.claude/plans/blueprint.plan.md)。
</details>

<details>
<summary><strong>如何添加我的 React / Vue 项目的专属组件配置？</strong></summary>

1. `/scout my-app --url=https://your-app.com` — 打开 Chromium，手动浏览所有页面
2. 系统自动采集组件签名 → 生成 `dictionaries/projects/my-app/components.yaml`
3. 如需修正，编辑同级 `_overrides.yaml`（不会因重新运行 scout 丢失）
</details>

<details>
<summary><strong>Stdio 和 HTTP 模式我该用哪个？</strong></summary>

- **Stdio** — Claude Desktop / VS Code / Codex 本地调用，最常用
- **HTTP** — 远程 Agent 调用或 CI/CD 流水线中运行，需要 `MCP_API_KEY` 做认证
</details>

---

## 📋 环境要求

| 依赖 | 版本 |
|:---|:---|
| Node.js | >= 20.0.0 |
| npm | >= 9.0.0 |
| @playwright/mcp | 0.0.76 |
| playwright-core | 1.60.0 |
| @modelcontextprotocol/server | 2.0.0-alpha.2 |
| TypeScript | 5.8+ |

---

## 🔧 可用命令

| 命令 | 说明 |
|:---|:---|
| `npm run build` | TypeScript 编译到 dist/ |
| `npm run typecheck` | 纯类型检查（不产出文件） |
| `npm run start:stdio` | 启动 Stdio MCP Server |
| `npm run start:http` | 启动 HTTP MCP Server |
| `npm run dev:stdio` | 开发模式 Stdio（tsx 热重载） |
| `npm run dev:http` | 开发模式 HTTP |
| `npm run clean` | 清理编译产物 |

---

## 🌐 跨平台支持

| 平台 | 支持情况 | 备注 |
|:---|:---:|:---|
| Windows 11 | ✅ | 主开发平台 |
| macOS | ✅ | Chromium 内存稍低于 Windows |
| Linux | ✅ | CI/CD 常用 |

> 📐 **并行度差异**：Windows 下 Chromium 开销约高 20%，自动检测会自动调低 `max_workers`。

---

## 🧪 测试

```bash
npm run typecheck               # 编译时类型验证（零错误）
# 单元测试 — Phase 1 后续
# E2E 测试 — Playwright MCP 集成后
```

---

## 📄 许可证

Apache-2.0

---

## 🔗 参考项目

| 项目 | 说明 |
|:---|:---|
| [Microsoft Playwright](https://github.com/microsoft/playwright) | Web 自动化引擎 |
| [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) | MCP 工具封装（23 个工具） |
| [ECC (Everything Claude Code)](https://github.com/xu-xiang/everything-claude-code-zh) | README 风格参考 |

---

<p align="center">
  <sub>设计蓝图完整版 → <a href="https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing/blob/main/.claude/plans/blueprint.plan.md">blueprint.plan.md</a> (2500+ 行)</sub>
</p>

<p align="center">
  <sub>🤖 Generated with <a href="https://claude.com/claude-code">Claude Code</a></sub>
</p>
