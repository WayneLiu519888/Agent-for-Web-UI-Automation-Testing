/**
 * 工具注册表
 *
 * 所有 MCP 工具在此文件中集中注册。
 * 未来按功能模块拆分时，各模块文件 export 工具数组，在此处汇总即可。
 *
 * 新增工具的步骤：
 * 1. 在此文件中 import Zod，定义 inputSchema
 * 2. 按照 ToolDefinition 接口构造工具对象
 * 3. 设置合适的 visibility（all / stdio / http）
 * 4. 将工具对象 push 到 ALL_TOOLS 数组
 * 5. 编写 handler 函数，实现工具逻辑
 */

import * as z from 'zod/v4';
import type { ToolDefinition } from '../types/tool.js';

/** 辅助函数：将工具定义对象标注为 ToolDefinition 类型 */
function def(tool: ToolDefinition): ToolDefinition {
  return tool;
}

// ==============================
// 示例工具（后续替换为真实工具）
// ==============================

/** 回显工具：验证通信是否正常 — 所有模式可见 */
const echoTool = def({
  name: 'echo',
  title: 'Echo',
  description: '回显输入的消息内容，用于验证 MCP Server 通信是否正常',
  inputSchema: z.object({
    message: z.string().describe('需要回显的消息内容'),
  }),
  visibility: 'all',
  handler: async ({ message }: { message: string }) => {
    return {
      content: [{ type: 'text', text: String(message) }],
    };
  },
});

/** Stdio 专用示例工具 */
const stdioDebugTool = def({
  name: 'debug-status',
  title: 'Debug Status',
  description: '返回 MCP Server 内部运行状态信息（仅 Stdio 模式可见）',
  inputSchema: z.object({}),
  visibility: 'stdio',
  handler: async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'running',
              uptime: process.uptime(),
              nodeVersion: process.version,
              memoryUsage: process.memoryUsage(),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
});

/** HTTP 专用示例工具 */
const httpPingTool = def({
  name: 'ping',
  title: 'Ping',
  description: '简单的 HTTP ping 端点，返回 pong（仅 HTTP 模式可见）',
  inputSchema: z.object({}),
  visibility: 'http',
  handler: async () => {
    return {
      content: [{ type: 'text', text: 'pong' }],
    };
  },
});

// ==============================
// 汇总导出
// ==============================

/** 所有已注册工具的统一数组 */
export const ALL_TOOLS: ToolDefinition[] = [
  echoTool,
  stdioDebugTool,
  httpPingTool,
  // 在此处继续添加新工具...
];
