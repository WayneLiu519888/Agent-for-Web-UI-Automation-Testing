<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-brightgreen?logo=nodedotjs" alt="Node">
  <img src="https://img.shields.io/badge/MCP-2.0.0_alpha-blue?logo=openai" alt="MCP">
  <img src="https://img.shields.io/badge/Playwright-1.60.0-2EAD33?logo=playwright" alt="PW">
  <img src="https://img.shields.io/badge/Apache-2.0-9966FF?logo=apache" alt="License">
  <img src="https://img.shields.io/badge/TS-zero_errors-informational?logo=typescript" alt="TS">
</p>

<h1 align="center">Agent-for-Web-UI-Automation-Testing</h1>

<p align="center">
  <strong>No Recording. No Scripting. — AI Agent-driven Web UI Automation MCP Server</strong>
</p>

<p align="center">
  The Agent reads page Accessibility Trees and DOM semantics,<br/>
  then autonomously reasons and executes Web operations from YAML test cases — in process-level parallel.
</p>

---

**Language**: **[English](docs/en/README.md)** | [简体中文](README.md) | [繁體中文](docs/zh-TW/README.md) | [日本語](docs/ja/README.md)

---

<details open><summary>Quick Guide</summary>

| I want to... | See |
|:---|:---|
| Get running | [Quick Start](#-quick-start) |
| Understand concepts | [Core Concepts](#-core-concepts) |
| See available tools | [6 MCP Tools](#-6-mcp-tools) |
| Configure Claude Desktop | [Installation](#-installation) |
</details>

## Core Concepts

### Orchestration vs Execution

```
Agent-for-Web-UI-Automation-Testing    ← Orchestration (6 tools)
  web-init / web-explore / executor / generator / snapshot / scout
          │ delegates browser ops
          ▼
@playwright/mcp  (23 tools)            ← Execution
  navigate / click / type / fill_form / select / hover / snapshot ...
```

### Reasoning-Execution Separation (Breakthrough)

```
Phase 1 — LLM Batch Planning (main process, ~1-3 min)
  All cases → LLM → ExecutionPlan (pure Playwright sequences)
Phase 2 — Process-Level Parallel (Worker Pool, zero LLM)
  Worker-1..N × Chromium-1..N → true simultaneous execution
Phase 3 — On-Demand Remediation (LLM)
  Failed → screenshot+AccTree → LLM re-reason → Worker retry
```

### Acc Tree: 8-Dimensional Snapshot

Each element: DOM + A11y + Geometry + Locators + Interaction + Framework + Text + Children

### Configurable Interaction Dictionary

65 event types + 20+ declarative match rules. 3-tier: `_overrides` → `components` → `base`

## Quick Start

```bash
git clone https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing.git
cd Agent-for-Web-UI-Automation-Testing
npm install && npx playwright-core install chromium && npm run build
```

## Installation

**Claude Desktop** (`settings.json`):
```json
{
  "mcpServers": {
    "webui-test": { "command": "node", "args": ["dist/entries/stdio.js"] },
    "playwright-mcp": { "command": "npx", "args": ["@playwright/mcp", "--headless"] }
  }
}
```

## 6 MCP Tools

| Want to... | Command | Tool |
|:---|:---|:---|
| Init + auto-login | `/web-init test-env` | `web-init` |
| Explore → Acc Tree | `/web-explore URL --mode=deep` | `web-explore` |
| Execute in parallel | `/exec-test cases/*.yaml` | `test-case-executor` |
| Convert Excel→YAML | `/gen-cases login.xlsx` | `case-generator` |
| Enhanced snapshot | `/snap` | `web-snapshot` |
| Discover components | `/scout my-app --url=URL` | `web-component-scout` |

### Multi-Platform Command Registration

All 6 tools auto-register across 3 AI coding frameworks:

| Platform | Directory | Files |
|:---|:---|:---:|
| Claude Code | `.claude/commands/` | 6 |
| OpenCode | `.opencode/commands/` | 6 |
| Codex | `.codex/skills/<name>/SKILL.md` | 6 |

## Security

Open Source Layer (`src/`) → GitHub ✅ | Enterprise Layer (`enterprise/`) → .gitignore ❌

## Requirements

| Dependency | Version |
|:---|:---|
| Node.js | >= 20.0.0 |
| @playwright/mcp | 0.0.76 |
| playwright-core | 1.60.0 |

Apache-2.0 | [Claude Code](https://claude.com/claude-code)
