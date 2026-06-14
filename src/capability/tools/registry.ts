/**
 * 工具注册表 — Agent-for-Web-UI-Automation-Testing
 *
 * 6 个 MCP 工具:
 *   1. web-init            — 初始化测试环境 + 自动登录
 *   2. web-explore         — 页面探索（快速/深度）
 *   3. test-case-executor  — 测试用例执行器（推理-执行分离 + Worker Pool）
 *   4. case-generator      — Excel → YAML 批量转换
 *   5. web-snapshot        — 增强 Acc Tree 快照
 *   6. web-component-scout — 交互式组件发现
 *
 * 所有底层浏览器操作（navigate/click/type/fill_form/screenshot...）委托 Playwright MCP 执行
 */

import * as z from 'zod/v4';
import type { ToolDefinition } from '../../types/tool.js';

/**
 * 工具定义辅助函数：接受泛型 schema + 精确类型 handler，
 * 内部通过 `as unknown as ToolDefinition` 将窄类型宽化，
 * 使调用方 handler 参数可获得 `z.infer<S>` 精确推导。
 */
function def<S extends z.ZodType>(tool: {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  visibility: ToolDefinition['visibility'];
  handler: (args: z.infer<S>) => ReturnType<ToolDefinition['handler']>;
}): ToolDefinition {
  return tool as unknown as ToolDefinition;
}

// ===== 1. web-init =====
const webInitSchema = z.object({
  environment: z.string().describe('环境配置名 — 对应 enterprise/environments/{name}.yaml'),
  account: z.string().optional().describe('使用的账号名（默认 admin）'),
  headless: z.boolean().optional().describe('是否无头模式（默认 true）'),
  save_state: z.boolean().optional().describe('是否保存登录态（默认 true）'),
});

const webInitTool = def({
  name: 'web-init',
  title: 'Test Environment Initializer',
  description:
    '读取环境配置 YAML → 委托 Playwright MCP 启动浏览器 → 自动执行登录流程 → 保存登录态。' +
    '内部调用 Playwright MCP 的 browser_navigate / browser_type / browser_click 等工具。',
  inputSchema: webInitSchema,
  visibility: 'all',
  handler: async (args) => {
    // args 类型为 z.infer<typeof webInitSchema>
    return {
      content: [{
        type: 'text',
        text: `[web-init] 环境 "${args.environment}" 初始化请求已接收。完整实现在 Phase 5。`,
      }],
    };
  },
});

// ===== 2. web-explore =====
const webExploreSchema = z.object({
  url: z.string().describe('要探索的页面 URL'),
  mode: z.enum(['quick', 'deep']).optional().describe('quick(单页) | deep(递归同域)，默认 quick'),
  max_depth: z.number().optional().describe('深度探索时的最大爬取深度（默认 2）'),
  max_pages: z.number().optional().describe('最大页面数（默认 20）'),
  output_dir: z.string().optional().describe('YAML 输出目录（默认 acc-trees）'),
});

const webExploreTool = def({
  name: 'web-explore',
  title: 'Web Page Exploration',
  description:
    '一键探索 Web 页面，产出增强版 Acc Tree YAML。' +
    '委托 Playwright MCP browser_navigate/browser_snapshot + page.evaluate() 补采 DOM 属性/几何/框架信息。',
  inputSchema: webExploreSchema,
  visibility: 'all',
  handler: async (args) => {
    return {
      content: [{
        type: 'text',
        text: `[web-explore] URL="${args.url}" mode="${args.mode || 'quick'}" — 完整实现在 Phase 3。`,
      }],
    };
  },
});

// ===== 3. test-case-executor =====
const testCaseExecutorSchema = z.object({
  cases: z.array(z.string()).describe('用例 YAML 文件路径或 glob 模式'),
  parallel: z.union([z.literal('auto'), z.number(), z.literal('serial')]).optional()
    .describe('并行数: auto(自动检测) | number | serial(串行)，默认 auto'),
  plan_mode: z.enum(['sprint', 'strict', 'hybrid']).optional()
    .describe('推理模式: sprint(冲刺) | strict(严格) | hybrid(混合)，默认 sprint'),
  retry: z.number().optional().describe('失败重试次数（默认 0）'),
  stop_on_failure: z.boolean().optional().describe('P0 失败是否终止（默认 false）'),
});

const testCaseExecutorTool = def({
  name: 'test-case-executor',
  title: 'Test Case Executor (Worker Pool + 推理执行分离)',
  description:
    '读取极简 YAML 用例 → 推理-执行分离三阶段 → 进程级并行执行 → 报告聚合。' +
    'Phase 1 批量 LLM 推理生成 ExecutionPlan → Phase 2 Worker Pool 并行执行（每 Worker 独立 Chromium）→ Phase 3 失败补救。',
  inputSchema: testCaseExecutorSchema,
  visibility: 'all',
  handler: async (args) => {
    return {
      content: [{
        type: 'text',
        text: `[test-case-executor] cases=${args.cases.length} parallel=${args.parallel || 'auto'} mode=${args.plan_mode || 'sprint'} — 完整实现在 Phase 4。`,
      }],
    };
  },
});

// ===== 4. case-generator =====
const caseGeneratorSchema = z.object({
  source: z.string().describe('.xlsx 文件路径'),
  output_dir: z.string().optional().describe('YAML 输出目录（默认 test-cases）'),
  sheet: z.string().optional().describe('工作表名（默认第一个 sheet）'),
  environment: z.string().optional().describe('若 Excel 中无环境列则统一使用此环境'),
});

const caseGeneratorTool = def({
  name: 'case-generator',
  title: 'Test Case Generator (Excel → YAML)',
  description:
    '将 Excel 格式的测试用例批量转换为极简 YAML 格式。智能列名匹配（支持中英文多别名）。',
  inputSchema: caseGeneratorSchema,
  visibility: 'all',
  handler: async (args) => {
    return {
      content: [{
        type: 'text',
        text: `[case-generator] source="${args.source}" — 完整实现在 Phase 5。`,
      }],
    };
  },
});

// ===== 5. web-snapshot =====
const webSnapshotSchema = z.object({
  compact: z.boolean().optional().describe('紧凑模式：仅输出 ref+role+actionable+locators(前2级)'),
});

const webSnapshotTool = def({
  name: 'web-snapshot',
  title: 'Enhanced Accessibility Tree Snapshot',
  description:
    'Playwright MCP browser_snapshot 增强版。' +
    '委托 browser_snapshot 获取 ARIA 树 + page.evaluate() 补采 DOM/几何/框架/定位器/交互事件。',
  inputSchema: webSnapshotSchema,
  visibility: 'all',
  handler: async (args) => {
    return {
      content: [{
        type: 'text',
        text: `[web-snapshot] compact=${args.compact || false} — 完整实现在 Phase 5。`,
      }],
    };
  },
});

// ===== 6. web-component-scout =====
const webComponentScoutSchema = z.object({
  project: z.string().describe('项目名称 → dictionaries/projects/{project}/'),
  base_url: z.string().describe('起始 URL'),
  session_timeout: z.number().optional().describe('最长会话秒数（默认 3600）'),
});

const webComponentScoutTool = def({
  name: 'web-component-scout',
  title: 'Web Component Scout',
  description:
    '交互式组件发现工具。打开 Chromium（非 headless），测试人员手动浏览页面，' +
    '系统自动采集 DOM 组件签名 → 生成项目级组件字典配置。',
  inputSchema: webComponentScoutSchema,
  visibility: 'all',
  handler: async (args) => {
    return {
      content: [{
        type: 'text',
        text: `[web-component-scout] project="${args.project}" base_url="${args.base_url}" — 完整实现在 Phase 3。`,
      }],
    };
  },
});

// ===== 汇总 =====
export const ALL_TOOLS: ToolDefinition[] = [
  webInitTool,
  webExploreTool,
  testCaseExecutorTool,
  caseGeneratorTool,
  webSnapshotTool,
  webComponentScoutTool,
];
