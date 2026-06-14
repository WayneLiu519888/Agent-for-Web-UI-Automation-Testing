/**
 * MCP Server 工厂函数
 *
 * 根据传输模式（stdio / http）创建 McpServer 实例，
 * 并按工具可见性自动过滤注册。
 *
 * 可见性规则：
 * - stdio 模式：注册 visibility 为 'all' 和 'stdio' 的工具
 * - http  模式：注册 visibility 为 'all' 和 'http' 的工具
 */

import { McpServer } from '@modelcontextprotocol/server';
import { ALL_TOOLS } from '../capability/tools/registry.js';
import { VISIBILITY_MAP, type TransportType } from '../types/tool.js';

/**
 * 根据传输类型创建 McpServer，自动注册符合条件的工具
 *
 * @param transportType - 传输模式：'stdio'（本地子进程）或 'http'（远程 HTTP）
 * @returns 已注册工具的 McpServer 实例
 */
export function createMcpServer(transportType: TransportType): McpServer {
  const server = new McpServer({
    name: 'agent-for-web-ui-testing',
    version: '0.1.0',
  });

  const allowedVisibilities = VISIBILITY_MAP[transportType];

  let registeredCount = 0;
  let skippedCount = 0;

  for (const tool of ALL_TOOLS) {
    if (!allowedVisibilities.includes(tool.visibility)) {
      skippedCount++;
      continue;
    }

    // ToolDefinition.handler 签名 (args: unknown, extra?: unknown) 与
    // MCP SDK ToolCallback 签名 (args: T, ctx: ServerContext) 不同。
    // 通过包装函数桥接：丢弃 ctx 并将 args 原样转发。
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        // Zod v4 schema 实现 StandardSchemaWithJSON 接口，
        // 可直接作为 MCP SDK 的 inputSchema 参数
        inputSchema: tool.inputSchema,
      },
      (args, _ctx) => tool.handler(args),
    );

    registeredCount++;
  }

  console.log(
    `[MCP] 传输模式=${transportType} | 注册工具=${registeredCount} | 跳过工具=${skippedCount}`,
  );

  return server;
}
