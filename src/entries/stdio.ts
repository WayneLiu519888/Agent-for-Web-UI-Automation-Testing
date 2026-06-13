#!/usr/bin/env node
/**
 * Stdio 传输入口
 *
 * 通过标准输入/输出与 MCP 客户端（如 Claude Desktop、VS Code 插件）通信。
 * 注册 visibility 为 'all' 和 'stdio' 的工具。
 *
 * 用法：
 *   node dist/entries/stdio.js
 *   npx tsx src/entries/stdio.ts
 */

import { StdioServerTransport } from '@modelcontextprotocol/server';
import { createMcpServer } from '../server/factory.js';

async function main() {
  const server = createMcpServer('stdio');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP Stdio] 服务已启动，等待客户端连接...');
}

main().catch((err) => {
  console.error('[MCP Stdio] 启动失败:', err);
  process.exit(1);
});
