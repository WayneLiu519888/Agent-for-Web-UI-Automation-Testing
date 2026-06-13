<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-brightgreen?logo=nodedotjs" alt="Node">
  <img src="https://img.shields.io/badge/MCP-2.0.0_alpha-blue?logo=openai" alt="MCP">
  <img src="https://img.shields.io/badge/Playwright-1.60.0-2EAD33?logo=playwright" alt="PW">
  <img src="https://img.shields.io/badge/Apache-2.0-9966FF?logo=apache" alt="License">
  <img src="https://img.shields.io/badge/TypeScript-エラーゼロ-informational?logo=typescript" alt="TS">
</p>

<h1 align="center">Agent-for-Web-UI-Automation-Testing</h1>

<p align="center">
  <strong>録画不要、スクリプト不要 — AIエージェント駆動のWeb UI自動化テストMCPサーバー</strong>
</p>

<p align="center">
  エージェントがページのAccessibility TreeとDOMセマンティクスを読み取り、<br/>
  YAMLテストケースに基づいて自律的に推論し、プロセスレベルの並列実行でWeb操作を行います。
</p>

---

**🌐 言語**: [English](docs/en/README.md) | [简体中文](README.md) | [繁體中文](docs/zh-TW/README.md) | **[日本語](docs/ja/README.md)**

---

<details open>
<summary><strong>📋 クイックガイド</strong></summary>

| したいこと | 参照先 |
|:---|:---|
| すぐに動かす | [🚀 クイックスタート](#-クイックスタート) |
| 機能を理解する | [🧠 コアコンセプト](#-コアコンセプト) |
| 利用可能なツールを見る | [🛠️ 6つのMCPツール](#️-6つのmcpツール) |
| Claude Desktopの設定 | [📥 インストール](#-インストール) |
</details>

---

## 🧠 コアコンセプト

### オーケストレーション ≠ 実行

```
Agent-for-Web-UI-Automation-Testing    ← オーケストレーション層 (6ツール)
  環境初期化 → ページ探索 → LLM推論 → 並列実行
          │ ブラウザ操作を委譲
          ▼
@playwright/mcp  (23ツール)            ← 実行層
  navigate / click / type / fill_form / select / hover / snapshot ...
```

> Playwright MCPには既に23の成熟したブラウザツールがあります。車輪の再発明はしません。6つのツールは**オーケストレーション層**に集中しています。

### 推論-実行分離（コアブレイクスルー）

```
Phase 1 — LLMバッチ推論 (メインプロセス, 約1-3分)
  全テストケース → LLM → ExecutionPlan（純粋なPlaywright操作シーケンス）

Phase 2 — プロセスレベル並列実行 (Worker Pool, LLM不要)
  Worker-1 (Chromium-1) ─┐
  Worker-2 (Chromium-2) ─┼─→ 20個のChromiumが同時稼働
  ...                     │   LLM不要 → レート制限なし
  Worker-N (Chromium-N) ─┘

Phase 3 — オンデマンド修復 (LLM)
  失敗ケース → スクリーンショット + Acc Tree → LLM再推論 → Worker再試行
```

### Acc Tree 8次元融合スナップショット

各要素：`DOM` + `A11y` + `Geometry` + `Locators` + `Interaction` + `Framework` + `Text` + `Children`

---

## 🚀 クイックスタート

```bash
git clone https://github.com/WayneLiu519888/Agent-for-Web-UI-Automation-Testing.git
cd Agent-for-Web-UI-Automation-Testing
npm install
npx playwright-core install chromium
npm run build
```

---

## 🛠️ 6つのMCPツール

| したいこと | コマンド | ツール |
|:---|:---|:---|
| ブラウザを初期化し自動ログイン | `/web-init test-env` | `web-init` |
| ページ構造を探索してAcc Tree生成 | `/web-explore https://x --mode=deep` | `web-explore` |
| テストケースを並列実行 | `/exec-test cases/*.yaml` | `test-case-executor` |
| Excel → YAML変換 | `/gen-cases login.xlsx` | `case-generator` |
| 拡張ページスナップショット取得 | `/snap` | `web-snapshot` |
| プロジェクト固有コンポーネント発見 | `/scout my-app --url=https://x` | `web-component-scout` |

---

### マルチプラットフォームコマンド

全6ツールが3つのAIコーディングフレームワークに自動登録：

| プラットフォーム | ディレクトリ | 数 |
|:---|:---|:---:|
| Claude Code | `.claude/commands/` | 6 |
| OpenCode | `.opencode/commands/` | 6 |
| Codex | `.codex/skills/<name>/SKILL.md` | 6 |

## 🔒 セキュリティ階層

```
Layer 1: オープンソース層 — src/ docs/ dictionaries/base/ → GitHub ✅
Layer 2: エンタープライズ機密層 — enterprise/ ディレクトリ全体 → .gitignore ❌
```

---

Apache-2.0 | 🤖 [Claude Code](https://claude.com/claude-code)
