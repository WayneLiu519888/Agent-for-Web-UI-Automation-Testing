/**
 * 工具注册表 — Agent-for-Web-UI-Automation-Testing
 *
 * 唯一可用工具: web-snapshot — 增强 Acc Tree 快照
 * 其他工具暂未实现（Phase 3-5）。
 */

import * as z from 'zod/v4';
import type { ZodType } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/server';

/** 工具暴露范围类型 */
export type ToolVisibility = 'all' | 'stdio' | 'http';

/** 传输类型 */
export type TransportType = 'stdio' | 'http';

/** 传输类型 → 可见性白名单 */
export const VISIBILITY_MAP: Record<TransportType, ToolVisibility[]> = {
  stdio: ['all', 'stdio'],
  http: ['all', 'http'],
};

/** 工具定义接口 */
export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodType;
  visibility: ToolVisibility;
  handler: (args: unknown, extra?: unknown) => Promise<CallToolResult>;
}

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

// ===== web-snapshot =====
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

// ===== 汇总 =====
export const ALL_TOOLS: ToolDefinition[] = [
  webSnapshotTool,
];
