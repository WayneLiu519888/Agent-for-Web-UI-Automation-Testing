/**
 * MCP Server 工厂函数
 *
 * 根据传输模式（stdio / http）创建 McpServer 实例，
 * 并按工具可见性自动过滤注册。
 */

import { McpServer } from '@modelcontextprotocol/server';
import { ALL_TOOLS, VISIBILITY_MAP } from '../capability/tools/registry.js';
import type { TransportType } from '../capability/tools/registry.js';

/**
 * 根据传输类型创建 McpServer，自动注册符合条件的工具
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

    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
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
