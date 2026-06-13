<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-brightgreen?logo=nodedotjs" alt="Node">
  <img src="https://img.shields.io/badge/MCP-2.0.0_alpha-blue?logo=openai" alt="MCP">
  <img src="https://img.shields.io/badge/Playwright-1.60.0-2EAD33?logo=playwright" alt="PW">
  <img src="https://img.shields.io/badge/Apache-2.0-9966FF?logo=apache" alt="License">
  <img src="https://img.shields.io/badge/TypeScript-零錯誤-informational?logo=typescript" alt="TS">
</p>

<h1 align="center">Agent-for-Web-UI-Automation-Testing</h1>

<p align="center">
  <strong>不錄製、不寫腳本 — 為 AI Agent 打造的 Web UI 自動化測試 MCP Server</strong>
</p>

<p align="center">
  Agent 讀取頁面 Accessibility Tree 結合 DOM 語義理解頁面結構，<br/>
  按照純文字 YAML 測試用例自主推論並以處理序層級並行執行 Web 操作。
</p>

---

**🌐 語言**: [English](docs/en/README.md) | [简体中文](README.md) | **[繁體中文](docs/zh-TW/README.md)** | [日本語](docs/ja/README.md)

---

<details open>
<summary><strong>📋 快速指引</strong></summary>

| 我想... | 看這裡 |
|:---|:---|
| 快速把專案跑起來 | [🚀 快速開始](#-快速開始) |
| 了解能做什麼 | [🧠 核心概念](#-核心概念) |
| 看有哪些工具可用 | [🛠️ 6 個 MCP 工具](#️-6-個-mcp-工具) |
| 設定 Claude Desktop | [📥 安裝方式](#-安裝方式) |
</details>

---

## 🧠 核心概念

### 編排層 ≠ 執行層

```
Agent-for-Web-UI-Automation-Testing    ← 編排層 (6 個工具)
  環境初始化 → 頁面探索 → LLM 推論 → 處理序並行
          │ 委託底層瀏覽器操作
          ▼
@playwright/mcp  (23 個工具)            ← 執行層
  navigate / click / type / fill_form / select / hover / snapshot ...
```

> Playwright MCP 已有 23 個成熟的瀏覽器工具，我們不做重複造輪。6 個工具專注於**編排層**。

### 推論-執行分離（核心突破）

```
Phase 1 — LLM 批次推論 (主處理序, ~1-3 min)
  所有用例 → LLM → ExecutionPlan（純 Playwright 操作序列）

Phase 2 — 處理序級並行執行 (Worker Pool, 無 LLM)
  Worker-1 (Chromium-1) ─┐
  Worker-2 (Chromium-2) ─┼─→ 20 個 Chromium 真正同時運轉
  ...                     │   無需 LLM，不受 rate limit 限制
  Worker-N (Chromium-N) ─┘

Phase 3 — 按需補救 (LLM)
  失敗用例 → 錯誤截圖 + Acc Tree → LLM 重新推論 → Worker 重試
```

### Acc Tree 8 維融合快照

每個頁面元素：`DOM` + `A11y` + `Geometry` + `Locators` + `Interaction` + `Framework` + `Text` + `Children`

### 可設定互動事件字典

```
dictionaries/
├── base/events.yaml      # 65 種互動事件（11 類別）
└── base/controls.yaml    # 20+ 宣告式 match 規則
```

**三級優先權**：`_overrides.yaml (人工)` → `components.yaml (自動)` → `base/controls.yaml (預設)`

---

## 🚀 快速開始

```bash
git clone https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing.git
cd Agent-for-Web-UI-Automation-Testing
npm install
npx playwright-core install chromium
npm run build
```

---

## 🛠️ 6 個 MCP 工具

| 我想... | 使用此命令 | 工具 |
|:---|:---|:---|
| 一鍵初始化瀏覽器並自動登入 | `/web-init test-env` | `web-init` |
| 探索頁面結構產生 Acc Tree | `/web-explore https://x --mode=deep` | `web-explore` |
| 並行執行測試用例 | `/exec-test cases/*.yaml` | `test-case-executor` |
| Excel 轉 YAML | `/gen-cases login.xlsx` | `case-generator` |
| 取得當前頁面增強快照 | `/snap` | `web-snapshot` |
| 發現專案專屬元件 | `/scout my-app --url=https://x` | `web-component-scout` |

---

## 🔒 資訊安全

```
Layer 1: 開放原始碼層 — src/ docs/ dictionaries/base/ → GitHub ✅
Layer 2: 企業機密層 — enterprise/ 整個目錄 → .gitignore ❌
```

---

Apache-2.0 | 🤖 [Claude Code](https://claude.com/claude-code)
